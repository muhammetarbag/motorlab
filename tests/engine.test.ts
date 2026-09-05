import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaults,
  simulate,
  displacement,
  mechanism,
  volume,
  phaseAt,
  valveLift,
  sweptVolume,
  ignitionAngle,
  burnFraction,
  sampleAt,
} from '../lib/engine.ts';
import { validateConfiguration, registerLabTool } from '../lib/webmcp.ts';
const near = (a: number, b: number, tolerance = 1e-8) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
void test('720 derece dört strok ve iki krank turudur', () => {
  [0, 180, 360, 540, 720].forEach((a, i) => {
    near(displacement(a), i % 2 ? 86 : 0);
    assert.equal(phaseAt(a), i % 4);
  });
  assert.equal(phaseAt(719.99), 3);
});
void test('biyel boyu 720 derece boyunca sabit, piston silindir içinde', () => {
  const r = 43,
    l = 143;
  for (let a = 0; a <= 720; a += 0.5) {
    const t = (a * Math.PI) / 180,
      x = displacement(a),
      pinY = -(r + l) + x,
      crankX = r * Math.sin(t),
      crankY = -r * Math.cos(t);
    near(Math.hypot(crankX, crankY - pinY), l);
    assert.ok(x >= -1e-8 && x <= 86.000001);
  }
});
void test('hacim geometrisi tüm sıkıştırma oranlarında tutarlı', () => {
  for (const cr of [6, 8, 10, 12, 14]) {
    near(volume(180, cr) / volume(0, cr), cr);
    near(volume(180, cr) - volume(0, cr), sweptVolume);
    near(volume(0, cr), volume(360, cr));
    assert.ok(volume(0, cr) > 0);
  }
  assert.ok(volume(0, 14) < volume(0, 6));
});
void test('temel supap zamanları dört aşamada doğru', () => {
  for (const [a, intake, exhaust] of [
    [90, true, false],
    [270, false, false],
    [450, false, false],
    [630, false, true],
  ] as const) {
    assert.equal(valveLift(a, 'intake') > 0, intake);
    assert.equal(valveLift(a, 'exhaust') > 0, exhaust);
  }
});
void test('örnek bindirme 700–720 ve 0–20 aralığında', () => {
  for (const a of [710, 0, 10]) {
    assert.ok(valveLift(a, 'intake', true) > 0);
    assert.ok(valveLift(a, 'exhaust', true) > 0);
  }
  assert.equal(valveLift(690, 'intake', true), 0);
  assert.equal(valveLift(25, 'exhaust', true), 0);
  near(valveLift(720, 'intake', true), valveLift(0, 'intake', true));
});
void test('avans işareti ve yanma başlangıcı aynı krank referansını kullanır', () => {
  for (const advance of [-10, 0, 15, 40]) {
    const p = { ...defaults, advance },
      ignition = ignitionAngle(p);
    assert.equal(ignition, 360 - advance);
    assert.equal(burnFraction(ignition - 1, p), 0);
    assert.equal(burnFraction(ignition, p), 0);
    assert.ok(burnFraction(ignition + 15, p) > 0);
    assert.ok(burnFraction(ignition + 80, p) > 0.99);
  }
});
void test('basınçta emme-sıkıştırma sınırı süreklidir', () => {
  const m = simulate(defaults);
  assert.ok(m.samples[181].pressure >= m.samples[180].pressure);
  assert.ok(m.samples[181].pressure / m.samples[180].pressure < 1.002);
  assert.ok(m.samples[330].pressure > m.samples[200].pressure);
  assert.ok(m.samples[330].temperature > m.samples[200].temperature);
});
void test('tork, güç, tüketim ve verim enerji açısından tutarlı', () => {
  const m = simulate(defaults);
  near(m.power, (m.torque * 2 * Math.PI * defaults.rpm) / 60000);
  const fuelPower = (((m.fuelConsumption * 0.745) / 3600) * 44e6) / 1000;
  near(m.efficiency, (100 * m.power) / fuelPower);
  assert.ok(m.efficiency > 0 && m.efficiency < m.idealEfficiency);
  assert.ok(m.torque > 0);
});
void test('altı deney beklenen fiziksel eğilimleri gösterir', () => {
  const base = simulate(defaults),
    early = simulate({ ...defaults, advance: 40 }),
    late = simulate({ ...defaults, advance: -10 }),
    highCr = simulate({ ...defaults, compression: 14 }),
    closed = simulate({ ...defaults, throttle: 0 }),
    rich = simulate({ ...defaults, afr: 10 }),
    lean = simulate({ ...defaults, afr: 20 }),
    fast = simulate({ ...defaults, rpm: 4500 });
  assert.ok(early.power < base.power);
  assert.ok(early.peakPressure > base.peakPressure);
  assert.ok(late.power < base.power);
  assert.ok(
    late.samples.findIndex((s) => s.pressure === late.peakPressure) >
      base.samples.findIndex((s) => s.pressure === base.peakPressure),
  );
  assert.ok(highCr.idealEfficiency > base.idealEfficiency);
  assert.ok(highCr.peakPressure > base.peakPressure);
  assert.ok(closed.torque < base.torque);
  assert.ok(closed.samples[90].pressure < base.samples[90].pressure);
  assert.ok(rich.fuelConsumption > lean.fuelConsumption);
  assert.ok(fast.power > base.power);
});
void test('tüm 32 parametre uç birleşiminde sonuçlar sonlu ve hacim pozitif', () => {
  let count = 0;
  for (const rpm of [500, 7000])
    for (const throttle of [0, 100])
      for (const compression of [6, 14])
        for (const advance of [-10, 40])
          for (const afr of [10, 20]) {
            const m = simulate({ rpm, throttle, compression, advance, afr });
            for (const s of m.samples) {
              assert.ok(s.pressure > 0 && Number.isFinite(s.pressure));
              assert.ok(
                s.temperature > -273.15 && Number.isFinite(s.temperature),
              );
              assert.ok(s.volume > 0);
            }
            for (const [key, value] of Object.entries(m))
              if (key !== 'samples') assert.ok(Number.isFinite(value), key);
            assert.ok(m.efficiency <= m.idealEfficiency);
            count++;
          }
  assert.equal(count, 32);
});
void test('grafik işaretçisi 0, 720 ve ara açılarda doğru örneği verir', () => {
  const m = simulate(defaults);
  assert.deepEqual(sampleAt(m.samples, 0), m.samples[0]);
  assert.deepEqual(sampleAt(m.samples, 720), m.samples[720]);
  near(
    sampleAt(m.samples, 350.5).pressure,
    (m.samples[350].pressure + m.samples[351].pressure) / 2,
  );
});
void test('WebMCP geçerli toplu ayarı kabul eder, hatalı girdi atomik reddedilir', () => {
  assert.deepEqual(
    validateConfiguration({ rpm: 500, angle: 720, running: false }),
    { rpm: 500, angle: 720, running: false },
  );
  for (const input of [
    null,
    [],
    { rpm: 7001 },
    { rpm: NaN },
    { angle: -1 },
    { afr: '14' },
    { running: 1 },
    { unknown: 7 },
  ])
    assert.throws(() => validateConfiguration(input));
});
void test('WebMCP kayıt, yürütme ve temizleme sözleşmesi', async () => {
  let tool:
      | {
          name: string;
          annotations: { readOnlyHint: boolean };
          inputSchema: { properties: { rpm: { maximum: number } } };
          execute: (input: unknown) => Promise<unknown>;
        }
      | undefined,
    signal: AbortSignal | undefined,
    result: unknown;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      modelContext: {
        registerTool: (t: unknown, o: { signal: AbortSignal }) => {
          tool = t as typeof tool;
          signal = o.signal;
        },
      },
    },
  });
  const cleanup = registerLabTool((v) => {
    result = v;
  });
  assert.ok(tool);
  assert.equal(tool.name, 'configure_engine_lab');
  assert.equal(tool.annotations.readOnlyHint, false);
  assert.equal(tool.inputSchema.properties.rpm.maximum, 7000);
  assert.deepEqual(await tool.execute({ rpm: 3500, angle: 345 }), {
    applied: { rpm: 3500, angle: 345 },
  });
  assert.deepEqual(result, { rpm: 3500, angle: 345 });
  await assert.rejects(() => tool!.execute({ rpm: 99999 }));
  assert.deepEqual(result, { rpm: 3500, angle: 345 });
  cleanup?.();
  assert.equal(signal?.aborted, true);
  Reflect.deleteProperty(globalThis, 'document');
});

void test('görsel krank, biyel ve piston aynı geometriyi kullanır', () => {
  for (let a = 0; a <= 720; a += 2) {
    const g = mechanism(a);
    near(Math.hypot(g.crankX - 330, g.crankY - g.pinY), g.l);
    near(g.top - g.tdc, (displacement(a) * 62) / 43);
  }
});
