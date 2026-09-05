'use client';
import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Layers3,
  BookOpen,
  ArrowRight,
  FlaskConical,
  Settings2,
  Gauge,
  Zap,
  ChevronRight,
  Info,
  X,
  MousePointer2,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EngineView } from '@/components/engine-view';
import { PressureChart, ValveTiming } from '@/components/pressure-chart';
import {
  defaults,
  phases,
  phaseAt,
  partInfo,
  simulate,
  sampleAt,
  valveLift,
  ignitionAngle,
  burnFraction,
  sweptVolume,
  limits,
  type Parameters,
} from '@/lib/engine';
import { experiments, terms } from '@/lib/experiments';
import { registerLabTool } from '@/lib/webmcp';
const number = (n: number, d = 1) =>
  n.toLocaleString('tr-TR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const speedOptions = [
  { name: 'Çok Yavaş', value: 0.25 },
  { name: 'Yavaş', value: 0.5 },
  { name: 'Normal', value: 1 },
  { name: 'Hızlı', value: 2 },
];
const parameterLabels: Record<
  keyof Parameters,
  { title: string; unit: string; note: string }
> = {
  rpm: {
    title: 'Motor devri',
    unit: 'RPM',
    note: 'Bir dakikadaki krank dönüşü',
  },
  throttle: {
    title: 'Gaz kelebeği',
    unit: '%',
    note: 'Motora giren hava miktarı',
  },
  compression: {
    title: 'Sıkıştırma oranı',
    unit: ':1',
    note: 'En büyük hacim / en küçük hacim',
  },
  advance: {
    title: 'Ateşleme avansı',
    unit: '°',
    note: 'Pozitif: ÜÖN’den önce · Negatif: sonra',
  },
  afr: {
    title: 'Hava–yakıt oranı',
    unit: ':1',
    note: 'Kütlece oran · Referans 14,7:1',
  },
};
function ParameterControl({
  name,
  value,
  onChange,
}: {
  name: keyof Parameters;
  value: number;
  onChange: (v: number) => void;
}) {
  const [min, max, step] = limits[name],
    info = parameterLabels[name];
  return (
    <div className="parameter-control">
      <div>
        <label id={`label-${name}`}>{info.title}</label>
        <output>
          {name === 'advance' && value > 0 ? '+' : ''}
          {number(value, step < 1 ? 1 : 0)}
          <small>{info.unit}</small>
        </output>
      </div>
      <Slider
        aria-labelledby={`label-${name}`}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
      <div className="range-ends">
        <span>
          {min}
          {info.unit}
        </span>
        <span>
          {max}
          {info.unit}
        </span>
      </div>
      <p>{info.note}</p>
    </div>
  );
}
export default function Home() {
  const [angle, setAngle] = useState(92),
    [running, setRunning] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [params, setParams] = useState<Parameters>(defaults),
    [speed, setSpeed] = useState(1),
    [stepMode, setStepMode] = useState(false),
    [labels, setLabels] = useState(true),
    [timing, setTiming] = useState(false),
    [mode, setMode] = useState('learn'),
    [chartMode, setChartMode] = useState('angle'),
    [experiment, setExperiment] = useState<string | null>(null);
  const model = useMemo(() => simulate(params), [params]),
    baseline = useMemo(() => simulate(defaults), []),
    sample = sampleAt(model.samples, angle),
    phaseIndex = phaseAt(angle),
    phase = phases[phaseIndex];
  const intake = valveLift(angle, 'intake', timing) > 0.001,
    exhaust = valveLift(angle, 'exhaust', timing) > 0.001,
    burning =
      angle >= ignitionAngle(params) &&
      burnFraction(angle, params) < 0.998 &&
      angle < 500,
    deadCenter = angle % 180 < 0.05;
  const exp = experiments.find((e) => e.id === experiment),
    airStatus =
      params.afr < 14.2
        ? 'Zengin karışım'
        : params.afr > 15.2
          ? 'Fakir karışım'
          : 'Stokiyometriye yakın';
  const risk =
    (params.compression >= 12.5 || params.advance >= 32) && params.throttle > 60
      ? 'Yükselmiş eğilim'
      : params.compression >= 10.5
        ? 'Orta eğilim'
        : 'Düşük eğilim';
  const seek = (a: number) => {
    setAngle(a);
    setRunning(false);
  };
  const nextPhase = () => {
    setStepMode(true);
    seek(((phaseIndex + 1) % 4) * 180 + 90);
  };
  const setParameter = (key: keyof Parameters, value: number) =>
    setParams((p) => ({ ...p, [key]: value }));
  useEffect(() => {
    if (!running) return;
    let id = 0,
      last = 0;
    const frame = (time: number) => {
      if (last && !document.hidden)
        setAngle(
          (a) =>
            (a + (Math.min(50, time - last) * params.rpm * 6 * speed) / 60000) %
            720,
        );
      last = time;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [running, params.rpm, speed]);
  useEffect(
    () =>
      registerLabTool((v) =>
        flushSync(() => {
          const { angle: a, running: r, ...p } = v;
          setParams((old) => ({ ...old, ...p }));
          if (a !== undefined) {
            setAngle(a);
            if (r === undefined) setRunning(false);
          }
          if (r !== undefined) {
            setRunning(r);
            if (r) setStepMode(false);
          }
          setMode('experiment');
        }),
      ),
    [],
  );
  const selectExperiment = (id: string) => {
    const e = experiments.find((x) => x.id === id)!;
    setExperiment(id);
    setParams({ ...defaults, ...e.settings });
    seek(e.angle);
    setMode('experiment');
    setSelected(null);
    if (id === 'early' || id === 'late') setSpeed(0.25);
    else setSpeed(1);
    setStepMode(false);
  };
  const description =
    timing && phaseIndex === 1 && intake
      ? 'Piston yukarı çıkmaya başladı; emme supabı geç kapanışını tamamlıyor. Supap kapandıktan sonra karışım sıkışır.'
      : timing && intake && exhaust
        ? 'Çevrim sınırında iki supap kısa bir süre birlikte açık. Bu aralığa supap bindirmesi denir. Gazların ataleti bazı koşullarda silindirin dolmasına yardım eder.'
        : phaseIndex === 2 && angle < ignitionAngle(params)
          ? 'Piston ÜÖN’yi geçti ve aşağı inmeye başladı. Geç ateşleme seçildiği için kıvılcım henüz oluşmadı; karışım bir süre yanmadan genleşiyor.'
          : phase.text;
  return (
    <main className="lab-shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Layers3 size={24} />
          </span>
          motor<span className="brand-light">lab</span>
          <span className="edition">SANAL MOTOR LABORATUVARI</span>
        </Link>
        <span className="educational">
          <span />
          Eğitim amaçlı simülasyon
        </span>
      </header>
      <div className="workspace-heading">
        <div>
          <div className="eyebrow">İÇTEN YANMALI MOTORLAR / 01</div>
          <h1>Dört zaman. Tek bir hareket.</h1>
          <p>
            Bir çevrimi keşfet. Parçalara dokun. Motorun nasıl çalıştığını gör.
          </p>
        </div>
        <span className="engine-spec">
          TEK SİLİNDİR <b>500 cm³</b> BENZİNLİ · 4 ZAMANLI
        </span>
      </div>
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(String(v))}
        className="main-tabs"
      >
        <div className="mode-bar">
          <TabsList className="mode-tabs" variant="line">
            <TabsTrigger value="learn">
              <BookOpen size={16} />
              Öğrenme Modu
            </TabsTrigger>
            <TabsTrigger value="experiment">
              <FlaskConical size={16} />
              Deney Modu
            </TabsTrigger>
            <TabsTrigger value="technical">
              <Settings2 size={16} />
              Teknik Detay
            </TabsTrigger>
          </TabsList>
          <span className="mode-hint">
            {mode === 'experiment'
              ? 'Bir değişkeni değiştir, sonucu gözlemle.'
              : '720° krank dönüşü = 1 tam çevrim'}
          </span>
        </div>
        <div
          className={`lab-grid ${mode === 'experiment' ? 'with-parameters' : ''}`}
        >
          {mode === 'experiment' && (
            <section className="parameter-panel">
              <div className="section-heading">
                <Settings2 size={17} />
                <h2>Motor parametreleri</h2>
              </div>
              {(Object.keys(parameterLabels) as (keyof Parameters)[]).map(
                (key) => (
                  <ParameterControl
                    key={key}
                    name={key}
                    value={params[key]}
                    onChange={(v) => setParameter(key, v)}
                  />
                ),
              )}
              <div className="mixture-badge">
                {airStatus} <span>λ = {number(params.afr / 14.7, 2)}</span>
              </div>
            </section>
          )}
          <section
            className="engine-panel"
            aria-label="Motor ve oynatma kontrolleri"
          >
            <div className="panel-top">
              <span>
                <Activity size={17} />
                Canlı motor kesiti
              </span>
              <span className={`status-pill ${running ? 'running' : ''}`}>
                <i />
                {running
                  ? 'Çalışıyor'
                  : stepMode
                    ? 'Adım Adım'
                    : 'Duraklatıldı'}
              </span>
            </div>
            <div className="engine-stage">
              <div className="phase-badge" style={{ color: phase.color }}>
                <span />
                {phase.name}
                <small>{phase.range}</small>
              </div>
              <EngineView
                angle={angle}
                params={params}
                labels={labels}
                timing={timing}
                selected={selected}
                onSelect={(id) => {
                  setSelected(id);
                  setRunning(false);
                }}
              />
              <div className="stage-caption">
                <MousePointer2 size={13} />
                {selected
                  ? `${partInfo[selected].title} seçildi · animasyon duraklatıldı`
                  : 'İncelemek için bir parçaya dokun'}
              </div>
              <div className="gas-key">
                <span style={{ color: phases[0].color }}>● Karışım</span>
                <span style={{ color: phases[2].color }}>● Yanma</span>
                <span style={{ color: phases[3].color }}>● Egzoz</span>
              </div>
            </div>
            <div
              className="mobile-parts"
              aria-label="İncelenecek motor parçası"
            >
              {Object.entries(partInfo).map(([id, p]) => (
                <button
                  key={id}
                  aria-pressed={selected === id}
                  onClick={() => {
                    setSelected(id);
                    setRunning(false);
                  }}
                >
                  {p.title}
                </button>
              ))}
            </div>
            <div className="transport">
              <button
                className="primary-button"
                onClick={() => {
                  setRunning(!running);
                  setStepMode(false);
                }}
              >
                {running ? <Pause size={17} /> : <Play size={17} />}{' '}
                {running ? 'Duraklat' : 'Motoru Başlat'}
              </button>
              <button
                className="icon-button"
                title="Baştan Başlat"
                aria-label="Baştan Başlat"
                onClick={() => {
                  seek(0);
                  setSelected(null);
                }}
              >
                <RotateCcw size={18} />
              </button>
              <RadioGroup
                aria-label="İzleme hızı"
                value={speed}
                onValueChange={(v) => setSpeed(Number(v))}
                className="speed-options"
              >
                {speedOptions.map((s) => (
                  <label
                    key={s.name}
                    className={speed === s.value ? 'chosen' : ''}
                  >
                    <RadioGroupItem value={s.value} />
                    <span>{s.name}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="playback-note">
              <span>
                İzleme hızı <b>{number(speed, 2)}×</b> · Yavaş çekim{' '}
                <b>1:{number(60 / speed, 0)}</b>
              </span>
              <span>
                Gerçek çevrim süresi: <b>{number(120000 / params.rpm, 1)} ms</b>
              </span>
            </div>
            <div className="angle-control">
              <div>
                <span id="crank-label">
                  Krank açısı <small>Elle çevirmek için sürükle</small>
                </span>
                <strong>
                  {number(angle, 0)}° <small>/ 720°</small>
                </strong>
              </div>
              <Slider
                aria-labelledby="crank-label"
                min={0}
                max={720}
                step={1}
                value={[angle]}
                onValueChange={(v) => seek(Array.isArray(v) ? v[0] : v)}
              />
              <div className="angle-ticks">
                {[0, 180, 360, 540, 720].map((a) => (
                  <span key={a}>{a}°</span>
                ))}
              </div>
            </div>
            <div className="phase-strip">
              {phases.map((p, i) => (
                <button
                  key={p.name}
                  className={phaseIndex === i ? 'active' : ''}
                  aria-pressed={phaseIndex === i}
                  style={{ '--phase-color': p.color } as React.CSSProperties}
                  onClick={() => seek(i * 180 + 90)}
                >
                  <span>0{i + 1}</span>
                  {p.name}
                  <small>{p.range}</small>
                </button>
              ))}
            </div>
            <div className="display-controls">
              <label htmlFor="part-label-toggle">
                <Switch
                  id="part-label-toggle"
                  checked={labels}
                  onCheckedChange={setLabels}
                />
                Parça etiketleri
              </label>
              <label htmlFor="step-mode-toggle">
                <Switch
                  id="step-mode-toggle"
                  checked={stepMode}
                  onCheckedChange={(v) => {
                    setStepMode(v);
                    setRunning(false);
                  }}
                />
                Adım Adım
              </label>
              <button className="text-button" onClick={nextPhase}>
                Sonraki Aşama <ArrowRight size={15} />
              </button>
            </div>
          </section>
          <aside className="right-column">
            <section className="side-panel">
              <div className="section-heading">
                <BookOpen size={17} />
                <h2>Şu anda ne oluyor?</h2>
                <span className="small-tag">0{phaseIndex + 1} / 04</span>
              </div>
              <div className="phase-description">
                <h3 style={{ color: phase.color }}>{phase.name}</h3>
                <p>{description}</p>
                <div className="fact-row">
                  <span>Piston</span>
                  <b>
                    {deadCenter
                      ? 'Ölü nokta · yön değişimi'
                      : `${phase.direction === 'aşağı' ? '↓' : '↑'} ${phase.direction} hareket`}
                  </b>
                </div>
                <div className="fact-row">
                  <span>Emme supabı</span>
                  <b className={intake ? 'intake-open' : ''}>
                    {intake ? '● Açık' : '○ Kapalı'}
                  </b>
                </div>
                <div className="fact-row">
                  <span>Egzoz supabı</span>
                  <b className={exhaust ? 'exhaust-open' : ''}>
                    {exhaust ? '● Açık' : '○ Kapalı'}
                  </b>
                </div>
                <div className="fact-row">
                  <span>Ateşleme</span>
                  <b>
                    {burning
                      ? 'ϟ Yanma ilerliyor'
                      : angle < ignitionAngle(params)
                        ? `${ignitionAngle(params)}°’de kıvılcım`
                        : 'Kıvılcım gerçekleşti'}
                  </b>
                </div>
              </div>
              <div className="gas-state">
                <span style={{ background: phase.color }} />
                <p>
                  {phaseIndex === 2 && angle < ignitionAngle(params)
                    ? 'Henüz yanmamış karışım'
                    : phase.gas}
                  <small>{phase.pressure}</small>
                </p>
              </div>
            </section>
            <section className="graph-panel">
              <div className="section-heading">
                <Activity size={17} />
                <h2>Silindirin nabzı</h2>
                <span className="small-tag">CANLI</span>
              </div>
              <Tabs
                value={chartMode}
                onValueChange={(v) => setChartMode(String(v))}
              >
                <TabsList className="chart-tabs">
                  <TabsTrigger value="angle">Basınç – Krank açısı</TabsTrigger>
                  <TabsTrigger value="pv">P–V diyagramı</TabsTrigger>
                </TabsList>
                <TabsContent value="angle">
                  <PressureChart
                    samples={model.samples}
                    angle={angle}
                    params={params}
                    pv={false}
                  />
                </TabsContent>
                <TabsContent value="pv">
                  <PressureChart
                    samples={model.samples}
                    angle={angle}
                    params={params}
                    pv
                  />
                </TabsContent>
              </Tabs>
              <div className="graph-readout">
                <span>
                  <i style={{ background: phase.color }} />
                  {number(sample.pressure, 2)} <small>bar</small>
                </span>
                <span>
                  {number(sample.temperature, 0)} <small>°C</small>
                </span>
                <span>
                  {number(sample.volume, 0)} <small>cm³</small>
                </span>
              </div>
            </section>
            {selected && (
              <section className="part-card" aria-live="polite">
                <div>
                  <span className="eyebrow">PARÇAYI TANI</span>
                  <button
                    aria-label="Parça bilgisini kapat"
                    onClick={() => setSelected(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <h3>{partInfo[selected].title}</h3>
                <p>{partInfo[selected].text}</p>
              </section>
            )}
          </aside>
        </div>
        <section className="metrics-bar" aria-label="Yaklaşık motor sonuçları">
          {[
            {
              title: 'Motor devri',
              value: number(params.rpm, 0),
              unit: 'RPM',
              icon: <Gauge size={15} />,
            },
            { title: 'Motor torku', value: number(model.torque), unit: 'N·m' },
            { title: 'Mil gücü', value: number(model.power, 2), unit: 'kW' },
            {
              title: 'Silindir basıncı',
              value: number(sample.pressure, 2),
              unit: 'bar',
            },
            {
              title: 'Gaz sıcaklığı',
              value: number(sample.temperature, 0),
              unit: '°C',
            },
            {
              title: 'Yakıt tüketimi',
              value: number(model.fuelConsumption, 2),
              unit: 'L/sa',
            },
            {
              title: 'Termal verim',
              value: number(model.efficiency),
              unit: '%',
            },
          ].map((m) => (
            <div key={m.title}>
              <span>
                {m.icon}
                {m.title}
              </span>
              <strong>
                {m.value}
                <small>{m.unit}</small>
              </strong>
            </div>
          ))}
        </section>
        <div className="model-notice">
          <Info size={15} />
          <p>
            Değerler eğitim amaçlı yaklaşık modelden hesaplanır. Gerçek
            mühendislik simülatörü değildir. RPM ayarlanan çalışma noktasıdır;
            yük altında hız değişimi veya stop etme hesaplanmaz.
          </p>
        </div>
        <section className="timing-toggle">
          <label htmlFor="valve-timing-toggle">
            <Switch
              id="valve-timing-toggle"
              checked={timing}
              onCheckedChange={setTiming}
            />
            Supap Zamanlamasını Göster
          </label>
          <span>Supapların açılışı, kapanışı ve bindirmesi</span>
        </section>
        {timing && <ValveTiming angle={angle} onAngle={seek} />}
        <TabsContent value="learn" className="learn-content">
          <div className="bottom-heading">
            <div>
              <span className="eyebrow">GÖZLEMLE → ANLA → DENE</span>
              <h2>Bir motoru anlamanın yolu, onu kurcalamak.</h2>
            </div>
            <button
              className="secondary-button"
              onClick={() => setMode('experiment')}
            >
              Deneylere geç <ArrowRight size={16} />
            </button>
          </div>
          <div className="learn-cards">
            <article>
              <span className="lesson-number">01</span>
              <h3>İki tur, dört zaman</h3>
              <p>
                Krank açısını 0°’den 720°’ye sürükle. Pistonun iki kez aşağı,
                iki kez yukarı gidişini izle.
              </p>
            </article>
            <article>
              <span className="lesson-number">02</span>
              <h3>Enerjinin izini sür</h3>
              <p>
                Mavi karışım içeri girer. Kıvılcım ve turuncu alevle basınç
                yükselir. Yanmış gazlar kırmızıyla dışarı çıkar.
              </p>
            </article>
            <article>
              <span className="lesson-number">03</span>
              <h3>Hareketi parçalarına ayır</h3>
              <p>
                Piston, biyel veya kranka dokun. Animasyon durur; seçtiğin
                parçanın görevini yanında okuyabilirsin.
              </p>
            </article>
          </div>
        </TabsContent>
        <TabsContent value="experiment" className="experiment-content">
          <div className="bottom-heading">
            <div>
              <span className="eyebrow">DENEY TEZGÂHI</span>
              <h2>Bir değişkeni değiştir. Farkı gör.</h2>
            </div>
            <button
              className="secondary-button"
              onClick={() => {
                setParams(defaults);
                setExperiment(null);
                setSpeed(1);
                seek(92);
              }}
            >
              {' '}
              <RotateCcw size={15} />
              Varsayılan ayarlar
            </button>
          </div>
          <div className="experiment-below">
            <div className="experiment-main">
              <div className="experiment-cards">
                {experiments.map((e, i) => (
                  <button
                    key={e.id}
                    className={`experiment-card ${experiment === e.id ? 'active' : ''}`}
                    aria-pressed={experiment === e.id}
                    onClick={() => selectExperiment(e.id)}
                  >
                    <span className="experiment-index">0{i + 1}</span>
                    <div>
                      <h3>{e.title}</h3>
                      <p>{e.question}</p>
                    </div>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
              <div className="experiment-result">
                <div className="section-heading">
                  <FlaskConical size={18} />
                  <h2>{exp ? exp.title : 'Kendi deneyini tasarla'}</h2>
                </div>
                <p>
                  {exp
                    ? exp.description
                    : 'Bir hazır deney seç veya soldaki ayarları değiştir. Motor, basınç eğrisi ve yaklaşık sonuçlar birlikte güncellenir.'}
                </p>
                {exp && <p className="experiment-hint">{exp.hint}</p>}
                <div className="comparison">
                  <span>
                    Varsayılana göre güç{' '}
                    <b
                      className={
                        model.power >= baseline.power ? 'positive' : 'warning'
                      }
                    >
                      {model.power >= baseline.power ? '+' : ''}
                      {number((model.power / baseline.power - 1) * 100)}%
                    </b>
                  </span>
                  <span>
                    Tepe basınç <b>{number(model.peakPressure)} bar</b>
                  </span>
                  <span>
                    Yakıt tüketimi{' '}
                    <b>{number(model.fuelConsumption, 2)} L/sa</b>
                  </span>
                </div>
                <p className="comparison-note">
                  Referans: 1.800 RPM · %65 gaz · 10:1 · +15° avans · 14,7:1
                  karışım.
                </p>
              </div>
              <div className="ignition-presets">
                <div>
                  <Zap size={17} />
                  <h3>Ateşlemeyi karşılaştır</h3>
                </div>
                <RadioGroup
                  aria-label="Ateşleme deneyi"
                  value={params.advance}
                  onValueChange={(v) => {
                    setParameter('advance', Number(v));
                    seek(360 - Number(v) - 5);
                    setSpeed(0.25);
                  }}
                  className="ignition-options"
                >
                  {[
                    { name: 'Çok geç', value: -10 },
                    { name: 'Normal', value: 15 },
                    { name: 'Çok erken', value: 40 },
                  ].map((o) => (
                    <label
                      key={o.value}
                      className={params.advance === o.value ? 'chosen' : ''}
                    >
                      <RadioGroupItem value={o.value} />
                      <span>
                        {o.name}
                        <small>
                          {o.value > 0 ? '+' : ''}
                          {o.value}°
                        </small>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
                <p>
                  {params.advance >= 30
                    ? 'Erken yükselen basınç, yukarı çıkan pistona karşı iş yapabilir. Vuruntu eğilimi de artabilir.'
                    : params.advance < 0
                      ? 'Kıvılcım ÜÖN’den sonra: basınç geç yükselir, genleşmeden daha az iş elde edilir.'
                      : 'Kıvılcım ÜÖN’den önce başlar; yanmanın büyük bölümü ÜÖN çevresinde ve sonrasında gerçekleşir. +15° burada örnek referanstır, her motorun optimum ayarı değildir.'}
                </p>
              </div>
              <div className="compression-cards">
                <article>
                  <span>ÜÖN’de kalan hacim</span>
                  <strong>
                    {number(sweptVolume / (params.compression - 1))}
                    <small>cm³</small>
                  </strong>
                  <button className="text-button" onClick={() => seek(360)}>
                    Yanma odasını gör →
                  </button>
                </article>
                <article>
                  <span>İdeal Otto verimi</span>
                  <strong>
                    {number(model.idealEfficiency)}
                    <small>%</small>
                  </strong>
                  <p>Kayıpsız ideal çevrim; mil veriminden farklıdır.</p>
                </article>
                <article>
                  <span>Vuruntu riski</span>
                  <strong className="risk-text">{risk}</strong>
                  <p>
                    Yalnızca nitel gösterge; yakıt oktanı ve gerçek sıcaklıklar
                    çözülmez.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="technical" className="technical-content">
          <div className="bottom-heading">
            <div>
              <span className="eyebrow">MERAK EDENLER İÇİN</span>
              <h2>Gördüğün hareketin arkasındaki fizik.</h2>
            </div>
          </div>
          <div className="technical-metrics">
            <span>
              Strok <b>86 mm</b>
            </span>
            <span>
              Çap <b>86 mm</b>
            </span>
            <span>
              İndike OEB <b>{number(model.imep)} bar</b>
            </span>
            <span>
              Dolum katsayısı <b>%{number(model.volumetricEfficiency)}</b>
            </span>
          </div>
          <div className="term-grid">
            {terms.map(([title, text]) => (
              <details key={title}>
                <summary>
                  {title}
                  <span>+</span>
                </summary>
                <p>{text}</p>
              </details>
            ))}
          </div>
          <article className="model-explanation">
            <h3>Bu model nasıl hesaplıyor?</h3>
            <p>
              Piston konumu sabit uzunluklu biyel–krank geometrisinden
              hesaplanır. Kapalı supaplar arasındaki gaz için ideal gaz
              bağıntısı, küçük krank açısı adımlarında sıkıştırma / genleşme işi
              ve zamana yayılan yaklaşık ısı salımı kullanılır. Basınç–hacim
              eğrisinin alanından çevrim işi, yaklaşık sürtünme kaybından sonra
              tork ve güç elde edilir.
            </p>
            <p>
              Gaz tek bir sıcaklıkla temsil edilir. Parçacıklar ve alev,
              hesaplanmış bir üç boyutlu akış değildir. Isı kaybı, dolum ve
              sürtünme katsayıları örnektir; gerçek bir motora kalibre
              edilmemiştir. Supap bindirmesinin gaz dinamiği, emisyonlar,
              vuruntu ve kontrol sistemi modellenmez. Negatif tork görülürse
              seçilen devri korumak için dışarıdan iş gerekir.
            </p>
            <div className="source-links">
              <a
                href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/engine-thermodynamic-analysis/"
                target="_blank"
                rel="noreferrer"
              >
                NASA · Otto çevrimi ↗
              </a>
              <a
                href="https://x-engineer.org/kinematic-analysis-piston/"
                target="_blank"
                rel="noreferrer"
              >
                Piston kinematiği ↗
              </a>
              <a
                href="https://www.hondainfocenter.com/Shared-Technologies/Engines/DOHC-i-VTEC-with-Variable-Timing-Control-VTC/"
                target="_blank"
                rel="noreferrer"
              >
                Honda · Supap bindirmesi ↗
              </a>
              <a
                href="https://www.boschautoparts.ca/documents/647135/1488055/Oxygen%20Sensors%20From%20Bosch.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Bosch · Hava–yakıt oranı ↗
              </a>
            </div>
          </article>
        </TabsContent>
      </Tabs>
      <footer>
        <span>motorlab</span> Bir çevrim, dört zaman, sayısız keşif.
        <span>Yaklaşık eğitim modeli · 2026</span>
      </footer>
    </main>
  );
}
