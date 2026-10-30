'use client';
import { useEffect, useState } from 'react';
import {
  burnFraction,
  mechanism,
  ignitionAngle,
  type Parameters,
  partInfo,
  phaseAt,
  phases,
  valveLift,
} from '@/lib/engine';
type Props = {
  angle: number;
  params: Parameters;
  labels: boolean;
  timing: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
};
export function EngineView({
  angle,
  params,
  labels,
  timing,
  selected,
  onSelect,
}: Props) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 520px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const a = angle % 720,
    phase = phaseAt(a),
    color = phases[phase === 2 && a < ignitionAngle(params) ? 1 : phase].color;
  const { r, cy, crankX, crankY, pinY, top, tdc } = mechanism(a);
  const head = tdc - 124 / (params.compression - 1);
  const intake = valveLift(a, 'intake', timing),
    exhaust = valveLift(a, 'exhaust', timing),
    burned = burnFraction(a, params),
    spark = a >= ignitionAngle(params) && a < ignitionAngle(params) + 9;
  const part = (id: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': partInfo[id].title,
    onClick: () => onSelect(id),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(id);
      }
    },
    className: `engine-part ${selected === id ? 'selected-part' : ''}`,
  });
  const label = (
    id: string,
    x: number,
    y: number,
    tx: number,
    ty: number,
    right = false,
  ) =>
    labels &&
    !compact && (
      <g {...part(id)}>
        <path
          d={`M${x + (right ? -8 : 124)},${y - 5} H${right ? x - 25 : x + 142} L${tx},${ty}`}
          fill="none"
          stroke="#5c6978"
        />
        <circle cx={tx} cy={ty} r="2.5" fill="#a1afbf" />
        <text x={x} y={y} fill="#bcc7d3" fontSize="13">
          {partInfo[id].title}
        </text>
      </g>
    );
  return (
    <svg
      className="engine-svg"
      viewBox={compact ? '140 50 380 545' : '0 0 690 590'}
      aria-label="Hareketli tek silindirli motor kesiti"
    >
      <defs>
        <linearGradient
          id="metal"
          gradientUnits="userSpaceOnUse"
          x1="225"
          x2="430"
        >
          <stop stopColor="#536274" />
          <stop offset=".3" stopColor="#c8d2df" />
          <stop offset=".48" stopColor="#8595a8" />
          <stop offset=".75" stopColor="#d4dde7" />
          <stop offset="1" stopColor="#4c5b6e" />
        </linearGradient>
        <linearGradient id="piston-metal" x1="0" x2="0" y2="1">
          <stop stopColor="#dce4ed" />
          <stop offset=".12" stopColor="#76889a" />
          <stop offset=".32" stopColor="#adbcca" />
          <stop offset="1" stopColor="#526174" />
        </linearGradient>
        <linearGradient id="gas" x1="0" y1="0" x2="0" y2="1">
          <stop
            stopColor={burned > 0 && phase < 3 ? '#ffbd63' : color}
            stopOpacity=".45"
          />
          <stop offset="1" stopColor={color} stopOpacity=".08" />
        </linearGradient>
        <radialGradient id="fire">
          <stop stopColor="#fff1b4" stopOpacity=".96" />
          <stop offset=".48" stopColor="#ffb444" stopOpacity=".76" />
          <stop offset="1" stopColor="#fa723c" stopOpacity="0" />
        </radialGradient>
        <pattern
          id="section"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 8L8 0" stroke="#7b8b9e" strokeOpacity=".3" />
        </pattern>
        <clipPath id="chamber-clip">
          <rect x="253" y={head} width="154" height={Math.max(1, top - head)} />
        </clipPath>
      </defs>
      <path
        d="M330 68V575"
        stroke="#627589"
        strokeDasharray="5 8"
        opacity=".3"
      />
      <g {...part('crank')}>
        <circle
          cx="330"
          cy={cy}
          r="85"
          fill="#1e2834"
          stroke="#39495b"
          strokeWidth="2"
        />
        <circle
          cx="330"
          cy={cy}
          r="73"
          fill="none"
          stroke="#566579"
          strokeDasharray="2 9"
        />
        <g transform={`rotate(${a} 330 ${cy})`}>
          <path
            d={`M301 ${cy - 17} Q282 ${cy + 70} 330 ${cy + 70} Q378 ${cy + 70} 359 ${cy - 17}Z`}
            fill="#566779"
            stroke="#91a1b1"
          />
          <path
            d={`M330 ${cy}V${cy - r}`}
            stroke="url(#metal)"
            strokeWidth="35"
            strokeLinecap="round"
          />
          <circle cx="330" cy={cy} r="23" fill="url(#metal)" stroke="#b9c6d3" />
          <circle cx="330" cy={cy} r="9" fill="#192330" />
        </g>
      </g>
      <g {...part('cylinder')}>
        <path
          d={`M233 ${head - 22}H253V386H233Z M407 ${head - 22}H427V386H407Z`}
          fill="#334252"
          stroke="#a1b0be"
        />
        <path
          d={`M233 ${head - 22}H253V386H233Z M407 ${head - 22}H427V386H407Z`}
          fill="url(#section)"
        />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <rect
              x="218"
              y={head + 36 + i * 22}
              width="15"
              height="8"
              rx="2"
              fill="#566578"
            />
            <rect
              x="427"
              y={head + 36 + i * 22}
              width="15"
              height="8"
              rx="2"
              fill="#566578"
            />
          </g>
        ))}
      </g>
      <g {...part('chamber')}>
        <rect
          x="253"
          y={head}
          width="154"
          height={Math.max(1, top - head)}
          fill="url(#gas)"
        />
        <g clipPath="url(#chamber-clip)">
          {Array.from(
            { length: Math.round(20 + params.throttle * 0.5) },
            (_, i) => {
              const f = (i * 0.618 + a / 4000) % 1;
              return (
                <circle
                  key={i}
                  cx={258 + ((i * 37 + Math.sin(a / 24 + i) * 4) % 143)}
                  cy={head + 3 + f * Math.max(1, top - head - 6)}
                  r={1.8 + (i % 3) * 0.4}
                  fill={burned > 0.05 && phase < 3 ? '#ffd397' : color}
                  opacity={0.4 + (i % 4) * 0.14}
                />
              );
            },
          )}
          {burned > 0 && a < 485 && (
            <ellipse
              cx="330"
              cy={head + 3}
              rx={burned * 210}
              ry={burned * 190}
              fill="url(#fire)"
              opacity={Math.max(0, 1 - (a - ignitionAngle(params)) / 160)}
            />
          )}
        </g>
      </g>
      <g {...part('inlet')}>
        <path
          d={`M155 ${head - 62} H235 Q276 ${head - 62} 279 ${head - 10}`}
          fill="none"
          stroke="#54687d"
          strokeWidth="32"
        />
        <path
          d={`M155 ${head - 62} H235 Q276 ${head - 62} 279 ${head - 10}`}
          fill="none"
          stroke="#172d43"
          strokeWidth="23"
        />
        <path
          d={`M181 ${head - 72}L${181 + (20 * params.throttle) / 100} ${head - 52}`}
          stroke="#86b7de"
          strokeWidth="4"
        />
        {intake > 0.01 &&
          Array.from(
            { length: Math.round(2 + params.throttle / 14) },
            (_, i) => {
              const f = (a / 70 + i / 8) % 1;
              return (
                <circle
                  key={i}
                  cx={160 + f * 119}
                  cy={head - 62 + Math.max(0, f - 0.64) * 145}
                  r="2.8"
                  fill="#62bcff"
                  opacity={0.3 + params.throttle / 145}
                />
              );
            },
          )}
      </g>
      <g {...part('outlet')}>
        <path
          d={`M381 ${head - 10} Q384 ${head - 62} 425 ${head - 62}H505`}
          fill="none"
          stroke="#735f61"
          strokeWidth="32"
        />
        <path
          d={`M381 ${head - 10} Q384 ${head - 62} 425 ${head - 62}H505`}
          fill="none"
          stroke="#35262d"
          strokeWidth="23"
        />
        {exhaust > 0.01 &&
          Array.from({ length: 8 }, (_, i) => {
            const f = (a / 70 + i / 8) % 1;
            return (
              <circle
                key={i}
                cx={381 + f * 124}
                cy={head - 10 - Math.min(1, f * 3) * 52}
                r="3"
                fill="#ff8686"
              />
            );
          })}
      </g>
      <path
        d={`M250 ${head - 18}H410V${head}H250Z`}
        fill="url(#metal)"
        stroke="#b4c1cd"
      />
      {(['intake', 'exhaust'] as const).map((id, i) => {
        const x = i ? 381 : 279,
          lift = (i ? exhaust : intake) * 12;
        return (
          <g key={id} {...part(id)}>
            <path
              d={`M${x} ${head - 78 + lift}V${head + lift}`}
              stroke="url(#metal)"
              strokeWidth="8"
            />
            <path
              d={`M${x - 15} ${head + lift}H${x + 15}`}
              stroke={i ? '#dd9898' : '#8fcdfb'}
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d={`M${x - 9} ${head - 72}l18 6 -18 6 18 6 -18 6 18 6 -18 6`}
              stroke="#8d9eaf"
              strokeWidth="2"
              fill="none"
            />
            <rect
              x={x - 13}
              y={head - 81}
              width="26"
              height="6"
              rx="2"
              fill="#8d9eaf"
            />
          </g>
        );
      })}
      <g {...part('spark')}>
        <rect
          x="323"
          y={head - 92}
          width="14"
          height="54"
          rx="5"
          fill="#e3ded2"
        />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M321 ${head - 77 + i * 7}H339`}
            stroke="#ada89f"
            strokeWidth="3"
          />
        ))}
        <path
          d={`M320 ${head - 36}H340V${head - 15}H335V${head + 3}H330V${head - 15}H325Z`}
          fill="url(#metal)"
        />
        {spark && (
          <>
            <circle cx="330" cy={head + 7} r="17" fill="#ffe9a8" opacity=".4" />
            <path
              d={`M335 ${head - 1}l-10 10 9 -2 -7 12`}
              fill="none"
              stroke="#fff4bd"
              strokeWidth="3"
            />
          </>
        )}
      </g>
      <g {...part('rod')}>
        <path
          d={`M330 ${pinY}L${crankX} ${crankY}`}
          stroke="#344152"
          strokeWidth="26"
          strokeLinecap="round"
        />
        <path
          d={`M330 ${pinY}L${crankX} ${crankY}`}
          stroke="url(#metal)"
          strokeWidth="19"
          strokeLinecap="round"
        />
        <path
          d={`M330 ${pinY}L${crankX} ${crankY}`}
          stroke="#536478"
          strokeWidth="5"
        />
        <circle
          cx={crankX}
          cy={crankY}
          r="16"
          fill="url(#metal)"
          stroke="#ccd6e1"
        />
        <circle cx={crankX} cy={crankY} r="7" fill="#263545" />
      </g>
      <g {...part('piston')}>
        <path
          d={`M255 ${top}H405V${top + 48}L386 ${top + 58}H274L255 ${top + 48}Z`}
          fill="url(#piston-metal)"
          stroke="#c3d1de"
          strokeWidth="1.5"
        />
        {[7, 13, 21].map((i) => (
          <path
            key={i}
            d={`M255 ${top + i}H405`}
            stroke="#253647"
            strokeWidth="3"
          />
        ))}
        <circle cx="330" cy={pinY} r="12" fill="#405366" stroke="#c7d4df" />
        <circle cx="330" cy={pinY} r="5" fill="#8395a8" />
      </g>
      <path
        d={`M451 ${tdc}h12 M457 ${tdc}V${tdc + 124} M451 ${tdc + 124}h12`}
        stroke="#63758a"
        fill="none"
      />
      <text x="467" y={tdc + 5} fill="#8294a8" fontSize="11">
        ÜÖN
      </text>
      <text x="467" y={tdc + 129} fill="#8294a8" fontSize="11">
        AÖN
      </text>
      <path
        opacity={a % 180 < 0.05 ? 0 : 1}
        d={
          phase % 2 === 0
            ? `M198 ${top + 5}v30l-6 -8m6 8 6 -8`
            : `M198 ${top + 35}v-30l-6 8m6 -8 6 8`
        }
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      {label('spark', 478, 70, 335, head - 62, true)}
      {label('intake', 24, 80, 279, head - 42)}
      {label('exhaust', 508, 115, 381, head - 34, true)}
      {label('inlet', 20, head - 41, 195, head - 62)}
      {label('outlet', 508, head - 35, 475, head - 62, true)}
      {label('chamber', 505, head + 34, 363, head + 8, true)}
      {label('cylinder', 30, 285, 241, 280)}
      {label('piston', 515, 300, 393, top + 33, true)}
      {label('rod', 30, 409, (330 + crankX) / 2, (pinY + crankY) / 2)}
      {label('crank', 504, 505, 365, 510, true)}
      <text
        x="330"
        y="34"
        textAnchor="middle"
        fill="#728498"
        fontSize="11"
        letterSpacing="2"
      >
        TEK SİLİNDİR · KESİT GÖRÜNÜMÜ
      </text>
    </svg>
  );
}
