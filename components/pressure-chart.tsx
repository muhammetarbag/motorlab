/* oxlint-disable jsx-a11y/prefer-tag-over-role -- SVG is the accessible live chart. */
'use client';
import {
  type Sample,
  type Parameters,
  ignitionAngle,
  phases,
  sampleAt,
} from '@/lib/engine';
export function PressureChart({
  samples,
  angle,
  params,
  pv,
}: {
  samples: Sample[];
  angle: number;
  params: Parameters;
  pv: boolean;
}) {
  const maxP = Math.ceil(Math.max(...samples.map((s) => s.pressure)) / 20) * 20,
    maxV = Math.ceil(Math.max(...samples.map((s) => s.volume)) / 100) * 100;
  const x = (s: Sample) => 42 + (pv ? s.volume / maxV : s.angle / 720) * 298,
    y = (p: number) => 167 - (p / maxP) * 131,
    current = sampleAt(samples, angle);
  // SVG is the semantic image; a raster img would lose the live plot.
  return (
    <svg
      viewBox="0 0 365 214"
      className="pressure-chart"
      role="img"
      aria-label={
        pv ? 'Basınç–hacim diyagramı' : 'Krank açısına göre silindir basıncı'
      }
    >
      <text x="4" y="14" className="chart-label">
        Basınç (bar, mutlak)
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line
            x1="42"
            x2="340"
            y1={y((maxP * i) / 4)}
            y2={y((maxP * i) / 4)}
            stroke="#33404e"
            strokeDasharray="3 5"
          />
          <text
            x="33"
            y={y((maxP * i) / 4) + 4}
            textAnchor="end"
            className="chart-tick"
          >
            {(maxP * i) / 4}
          </text>
        </g>
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const v = ((pv ? maxV : 720) * i) / 4;
        return (
          <g key={i}>
            <line
              x1={42 + i * 74.5}
              x2={42 + i * 74.5}
              y1="36"
              y2="167"
              stroke="#283441"
            />
            <text
              x={42 + i * 74.5}
              y="186"
              textAnchor="middle"
              className="chart-tick"
            >
              {v}
            </text>
          </g>
        );
      })}
      {!pv && (
        <>
          <line
            x1={42 + (ignitionAngle(params) / 720) * 298}
            x2={42 + (ignitionAngle(params) / 720) * 298}
            y1="27"
            y2="167"
            stroke="#efc783"
            strokeDasharray="2 3"
            opacity=".6"
          />
          <text
            x={42 + (ignitionAngle(params) / 720) * 298 + 4}
            y="28"
            className="chart-tick"
            fill="#efc783"
          >
            Kıvılcım
          </text>
        </>
      )}
      {phases.map((phase, i) => (
        <path
          key={phase.name}
          d={samples
            .slice(i * 180, (i + 1) * 180 + 1)
            .filter((_, j) => j % 2 === 0)
            .map(
              (s, j) =>
                `${j === 0 ? 'M' : 'L'}${x(s).toFixed(2)},${y(s.pressure).toFixed(2)}`,
            )
            .join(' ')}
          fill="none"
          stroke={phase.color}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      ))}
      {!pv && (
        <line
          x1={x(current)}
          x2={x(current)}
          y1="36"
          y2="167"
          stroke="#e0eaf5"
          strokeWidth="1"
          opacity=".6"
        />
      )}
      <circle
        cx={x(current)}
        cy={y(current.pressure)}
        r="6"
        fill="#e9f4fc"
        opacity=".2"
      />
      <circle
        cx={x(current)}
        cy={y(current.pressure)}
        r="3.2"
        fill="#f4f7fb"
        stroke="#122330"
      />
      <text x="190" y="209" textAnchor="middle" className="chart-label">
        {pv ? 'Silindir hacmi (cm³)' : 'Krank açısı (°)'}
      </text>
    </svg>
  );
}
export function ValveTiming({
  angle,
  onAngle,
}: {
  angle: number;
  onAngle: (a: number) => void;
}) {
  return (
    <div className="timing-panel">
      <div className="section-heading">
        <h2>Supaplar ne zaman açık?</h2>
        <span className="small-tag">ÖRNEK ZAMANLAMA</span>
      </div>
      <div className="timing-scale">
        <span>0°</span>
        <span>180°</span>
        <span>360°</span>
        <span>540°</span>
        <span>720°</span>
      </div>
      <div className="timing-bars">
        <div>
          <span>Emme</span>
          <div>
            <i
              style={{
                left: 0,
                width: `${(220 / 720) * 100}%`,
                background: '#62bcff',
              }}
            />
            <i
              style={{
                left: `${(700 / 720) * 100}%`,
                width: `${(20 / 720) * 100}%`,
                background: '#62bcff',
              }}
            />
            <b style={{ left: `${(angle / 720) * 100}%` }} />
          </div>
        </div>
        <div>
          <span>Egzoz</span>
          <div>
            <i
              style={{
                left: 0,
                width: `${(20 / 720) * 100}%`,
                background: '#ff8686',
              }}
            />
            <i
              style={{
                left: `${(510 / 720) * 100}%`,
                width: `${(210 / 720) * 100}%`,
                background: '#ff8686',
              }}
            />
            <b style={{ left: `${(angle / 720) * 100}%` }} />
          </div>
        </div>
      </div>
      <p>
        Emme: 700°’de açılır, 220°’de kapanır. Egzoz: 510°’de açılır, sonraki
        çevrimin 20°’sinde kapanır.
      </p>
      <button className="text-button" onClick={() => onAngle(0)}>
        40° supap bindirmesini incele →
      </button>
      <p className="muted">
        700°–720° ve 0°–20° aralığında iki supap birlikte açıktır. Çıkış gazı
        bazı koşullarda taze doluma yardım eder. Bu görünüm örnek supap
        hareketini gösterir; basınç hesabı temel 180° zamanlarını kullanır.
      </p>
    </div>
  );
}
