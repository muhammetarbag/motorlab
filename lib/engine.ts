export type Parameters = {
  rpm: number;
  throttle: number;
  compression: number;
  advance: number;
  afr: number;
};
export const defaults: Parameters = {
  rpm: 1800,
  throttle: 65,
  compression: 10,
  advance: 15,
  afr: 14.7,
};
export const limits: Record<keyof Parameters, [number, number, number]> = {
  rpm: [500, 7000, 100],
  throttle: [0, 100, 1],
  compression: [6, 14, 0.1],
  advance: [-10, 40, 1],
  afr: [10, 20, 0.1],
};
export const phases = [
  {
    name: 'Emme',
    range: '0°–180°',
    color: '#62bcff',
    direction: 'aşağı',
    text: 'Piston aşağı inerken silindirin hacmi büyür. Açık emme supabından hava–yakıt karışımı içeri dolar.',
    gas: 'Hava–yakıt karışımı',
    pressure: 'Emme basıncı yaklaşık sabit; gaz kelebeği kapandıkça azalır.',
  },
  {
    name: 'Sıkıştırma',
    range: '180°–360°',
    color: '#b5a0ff',
    direction: 'yukarı',
    text: 'İki supap kapanır. Piston yukarı çıkarak karışımı daha küçük bir hacme sıkıştırır; basınç ve sıcaklık yükselir.',
    gas: 'Sıkışan karışım',
    pressure: 'Hacim küçülürken basınç ve sıcaklık yükselir.',
  },
  {
    name: 'Yanma / Güç',
    range: '360°–540°',
    color: '#ffbb61',
    direction: 'aşağı',
    text: 'Bujiyle başlayan yanma gazı ısıtır. Yüksek basınç pistonu aşağı iter; biyel ve krank bu hareketi dönmeye çevirir.',
    gas: 'Yanan ve genleşen gaz',
    pressure: 'Yanmanın başında basınç hızla yükselir; genleşmeyle düşer.',
  },
  {
    name: 'Egzoz',
    range: '540°–720°',
    color: '#ff8686',
    direction: 'yukarı',
    text: 'Egzoz supabı açılır. Yukarı çıkan piston yanmış gazları dışarı iter; silindir yeni çevrime hazırlanır.',
    gas: 'Yanmış egzoz gazı',
    pressure: 'Gazlar dışarı çıkarken basınç egzoz hattına yaklaşır.',
  },
] as const;
export const wrap = (a: number) => ((a % 720) + 720) % 720;
export const phaseAt = (a: number) => Math.floor(wrap(a) / 180);
export const displacement = (a: number) => {
  const t = (a * Math.PI) / 180,
    r = 43,
    l = 143;
  return (
    r * (1 - Math.cos(t)) + l - Math.sqrt(l * l - r * r * Math.sin(t) ** 2)
  );
};
export function mechanism(angle: number) {
  const r = 62,
    l = (r * 143) / 43,
    cy = 495,
    t = (angle * Math.PI) / 180;
  const pinY = cy - r - l + (displacement(angle) * r) / 43;
  return {
    r,
    l,
    cy,
    crankX: 330 + r * Math.sin(t),
    crankY: cy - r * Math.cos(t),
    pinY,
    top: pinY - 24,
    tdc: cy - r - l - 24,
  };
}
export const sweptVolume = (((Math.PI * 86 ** 2) / 4) * 86) / 1000;
export const volume = (a: number, cr: number) =>
  sweptVolume / (cr - 1) + (sweptVolume * displacement(a)) / 86;
export function valveLift(
  a: number,
  valve: 'intake' | 'exhaust',
  timing = false,
) {
  const start = valve === 'intake' ? (timing ? 700 : 0) : timing ? 510 : 540,
    duration = timing ? (valve === 'intake' ? 240 : 230) : 180,
    offset = wrap(a - start);
  return offset < duration ? Math.sin((Math.PI * offset) / duration) ** 1.5 : 0;
}
export const ignitionAngle = (p: Parameters) => 360 - p.advance;
export function burnFraction(a: number, p: Parameters) {
  const x = Math.max(
    0,
    Math.min(1, (a - ignitionAngle(p)) / (48 + Math.abs(p.afr - 13.5) * 2)),
  );
  return 1 - Math.exp(-6.9 * x ** 3);
}
export type Sample = {
  angle: number;
  volume: number;
  pressure: number;
  temperature: number;
};
export function simulate(p: Parameters) {
  const gamma = 1.35,
    cv = 287 / (gamma - 1),
    intakeT = 310;
  const volumetricEfficiency = Math.max(
    0.62,
    0.91 - ((p.rpm - 3500) / 8500) ** 2,
  );
  const intakeP =
    (0.25 + (0.73 * p.throttle) / 100) * 1e5 * volumetricEfficiency;
  const airMass =
      (intakeP * volume(180, p.compression) * 1e-6) / (287 * intakeT),
    fuelMass = airMass / p.afr;
  const mixtureEfficiency = Math.max(0.25, 1 - ((p.afr - 13.8) / 9) ** 2);
  const availableHeat =
    fuelMass * 44e6 * Math.min(1, p.afr / 14.7) * mixtureEfficiency * 0.72;
  const samples: Sample[] = [];
  let temperature = intakeT,
    pressure = intakeP,
    work = 0;
  for (let a = 0; a <= 720; a++) {
    const v = volume(a, p.compression) * 1e-6,
      prevV = volume(Math.max(0, a - 1), p.compression) * 1e-6;
    if (a <= 180) {
      pressure = intakeP;
      temperature = intakeT;
    } else if (a <= 540) {
      const addedHeat =
        availableHeat * (burnFraction(a, p) - burnFraction(a - 1, p));
      temperature =
        temperature * (prevV / v) ** (gamma - 1) + addedHeat / (airMass * cv);
      pressure = (airMass * 287 * temperature) / v;
    } else {
      const blowdown = Math.exp(-(a - 540) / 6),
        end = samples[540];
      pressure = 1.05e5 + (end.pressure * 1e5 - 1.05e5) * blowdown;
      temperature = 720 + (end.temperature + 273.15 - 720) * blowdown;
    }
    if (a > 0)
      work += 0.5 * (pressure + samples[a - 1].pressure * 1e5) * (v - prevV);
    samples.push({
      angle: a,
      volume: v * 1e6,
      pressure: pressure / 1e5,
      temperature: temperature - 273.15,
    });
  }
  const frictionWork = (0.45 + p.rpm / 9500) * 1e5 * sweptVolume * 1e-6,
    brakeWork = work - frictionWork,
    torque = brakeWork / (4 * Math.PI),
    power = (torque * 2 * Math.PI * p.rpm) / 60 / 1000,
    fuelConsumption = (fuelMass * (p.rpm / 120) * 3600) / 0.745;
  return {
    samples,
    torque,
    power,
    fuelConsumption,
    efficiency: Math.max(0, brakeWork / (fuelMass * 44e6)) * 100,
    idealEfficiency: (1 - 1 / p.compression ** (gamma - 1)) * 100,
    imep: work / (sweptVolume * 1e-6) / 1e5,
    volumetricEfficiency: volumetricEfficiency * 100,
    peakPressure: Math.max(...samples.map((s) => s.pressure)),
  };
}
export function sampleAt(samples: Sample[], angle: number): Sample {
  const a = Math.max(0, Math.min(720, angle)),
    i = Math.floor(a),
    f = a - i,
    x = samples[i],
    y = samples[Math.min(720, i + 1)];
  return {
    angle: a,
    volume: x.volume + (y.volume - x.volume) * f,
    pressure: x.pressure + (y.pressure - x.pressure) * f,
    temperature: x.temperature + (y.temperature - x.temperature) * f,
  };
}
export const partInfo: Record<string, { title: string; text: string }> = {
  cylinder: {
    title: 'Silindir',
    text: 'Pistonun içinde hareket ettiği hassas yüzeydir. Gazı içeride tutan çalışma hacminin duvarını oluşturur.',
  },
  piston: {
    title: 'Piston',
    text: 'Yanma sonucu oluşan gaz basıncını doğrusal harekete dönüştürür. Biyel kolu ve krank mili bu hareketi dönme hareketine çevirir.',
  },
  rod: {
    title: 'Biyel kolu',
    text: 'Piston pimini krank pimine bağlar. İki ucu dönebilir; uzunluğu sabittir. Piston kuvvetini krank miline iletir.',
  },
  crank: {
    title: 'Krank mili',
    text: 'Biyelden gelen kuvvetle döner. Bir tam dört zamanlı çevrimde iki tur, yani 720° döner. Volan diğer zamanlarda hareketin sürmesine yardım eder.',
  },
  intake: {
    title: 'Emme supabı',
    text: 'Taze hava–yakıt karışımının girişini açıp kapatır. Temel çevrimde emme zamanında açıktır; gerçek zamanlamada biraz erken açılıp geç kapanabilir.',
  },
  exhaust: {
    title: 'Egzoz supabı',
    text: 'Yanmış gazların çıkışını kontrol eder. Temel çevrimde egzoz zamanında açılır; sıkıştırma ve yanma sırasında sızdırmazlık sağlar.',
  },
  spark: {
    title: 'Buji',
    text: 'Elektrotları arasında bir kıvılcım oluşturarak karışımın yanmasını başlatır. Yanma zaman aldığı için kıvılcım çoğunlukla piston ÜÖN’ye ulaşmadan oluşur.',
  },
  chamber: {
    title: 'Yanma odası',
    text: 'Piston tepesinin üstünde kalan gaz hacmidir. Piston en üstteyken bile sıfır olmaz. Sıkıştırma oranını artırdığında bu küçük kalan hacmin azaldığını izle.',
  },
  inlet: {
    title: 'Emme manifoldu',
    text: 'Hava–yakıt karışımını emme supabına taşır. Şema, emme kanalında karışım hazırlanan benzinli motoru temsil eder. Gaz kelebeği dolumu sınırlar.',
  },
  outlet: {
    title: 'Egzoz manifoldu',
    text: 'Silindirden çıkan sıcak yanmış gazları egzoz hattına taşır. Kırmızı parçacıklar bu gazların yönünü gösterir.',
  },
};
