/**
 * RadarChart — continuous-animation radar for pillar peaks.
 *
 *   Draws the classic spider chart, PLUS:
 *     · a rotating radar-sweep wedge that circles the whole plane (10 s / rev)
 *     · each vertex has a "ping" pulse ring that inflates + fades on a loop
 *     · the data polygon subtly breathes (edge shimmer via a shifting gradient)
 *     · grid rings dashed and slowly rotate in alternating directions
 *     · centre AVG% number scales in on mount, then holds steady
 *
 *   Pure SVG + Framer. Palette locked to the Luminous Engine primary green
 *   with per-vertex accent colour handed in via props.
 */
import { motion } from 'framer-motion';
import { useId } from 'react';

type Props = {
  axes:    string[];
  values:  number[];
  colors:  string[];
  size?:   number;
  levels?: number;
};

export default function RadarChart({
  axes,
  values,
  colors,
  size = 380,
  levels = 4,
}: Props) {
  const id = useId();
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 56;
  const n  = axes.length;

  const pointAt = (i: number, v: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const rr = (v / 100) * r;
    return { x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr };
  };
  const labelAt = (i: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const rr = r + 28;
    return { x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr };
  };

  const gridPoly = (level: number) =>
    Array.from({ length: n }, (_, i) => {
      const p = pointAt(i, (level / levels) * 100);
      return `${p.x},${p.y}`;
    }).join(' ');

  const dataPoly = Array.from({ length: n }, (_, i) => {
    const p = pointAt(i, values[i] ?? 0);
    return `${p.x},${p.y}`;
  }).join(' ');

  const avg = Math.round(values.reduce((a, b) => a + b, 0) / Math.max(1, values.length));

  return (
    <div className="relative w-full" style={{ aspectRatio: '1 / 1', maxWidth: size }}>
      {/* A11y data table — visible to screen readers only */}
      <table className="sr-only">
        <caption>Proficiency by capability pillar</caption>
        <thead><tr><th>Pillar</th><th>Proficiency</th></tr></thead>
        <tbody>
          {axes.map((a, i) => (
            <tr key={a}><td>{a}</td><td>{values[i]}%</td></tr>
          ))}
        </tbody>
      </table>

      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" aria-hidden>
        <defs>
          {/* Filled data polygon — soft green radial gradient. */}
          <radialGradient id={`fill-${id}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%"   stopColor="#00d166" stopOpacity="0.42" />
            <stop offset="60%"  stopColor="#006d32" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0a5ccf" stopOpacity="0.05" />
          </radialGradient>

          {/* Sweep wedge — one edge fully green, fading to transparent at the other. */}
          <linearGradient id={`sweep-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#00d166" stopOpacity="0" />
            <stop offset="55%"  stopColor="#00d166" stopOpacity="0.06" />
            <stop offset="95%"  stopColor="#00d166" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#00d166" stopOpacity="0.45" />
          </linearGradient>

          {/* Soft glow for the data outline. */}
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip path so the rotating sweep can't leak outside the radar circle. */}
          <clipPath id={`clip-${id}`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>

        {/* Rotating radar sweep — a triangle wedge, clipped to the radar circle. */}
        <g clipPath={`url(#clip-${id})`}>
          <motion.g
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <path
              d={`M ${cx} ${cy} L ${cx + r + 20} ${cy - r * 0.35} A ${r + 20} ${r + 20} 0 0 1 ${cx + r + 20} ${cy + r * 0.35} Z`}
              fill={`url(#sweep-${id})`}
            />
          </motion.g>
        </g>

        {/* Grid rings — dashed, alternating rotation direction for a subtle animated feel. */}
        {Array.from({ length: levels }, (_, l) => (
          <motion.polygon
            key={l}
            points={gridPoly(l + 1)}
            fill="none"
            stroke="#0a0a1a"
            strokeOpacity={0.10 + l * 0.02}
            strokeWidth={1}
            strokeDasharray={l % 2 ? '3 6' : '2 4'}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            animate={{ rotate: l % 2 ? -360 : 360 }}
            transition={{ duration: 80 + l * 12, repeat: Infinity, ease: 'linear' }}
          />
        ))}

        {/* Axis spokes */}
        {axes.map((_, i) => {
          const p = pointAt(i, 100);
          return (
            <line
              key={i}
              x1={cx} y1={cy} x2={p.x} y2={p.y}
              stroke="#0a0a1a"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon — draws in once on mount. */}
        <motion.polygon
          points={dataPoly}
          fill={`url(#fill-${id})`}
          stroke="#00d166"
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          filter={`url(#glow-${id})`}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Data-point vertices with a looping ping ring on each. */}
        {axes.map((a, i) => {
          const dp = pointAt(i, values[i] ?? 0);
          const lab = labelAt(i);
          const color = colors[i] ?? '#00d166';
          const delay = i * 0.35;
          return (
            <g key={a}>
              {/* Ping ring — inflates + fades on a 3s loop, staggered per vertex. */}
              <motion.circle
                cx={dp.x}
                cy={dp.y}
                r={4}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                initial={{ opacity: 0.7, scale: 1 }}
                animate={{ opacity: [0.7, 0, 0.7], scale: [1, 3, 1] }}
                transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeOut' }}
              />
              {/* Solid vertex dot */}
              <motion.circle
                cx={dp.x} cy={dp.y} r={5}
                fill={color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 320, damping: 18 }}
                style={{ filter: `drop-shadow(0 0 10px ${color})` }}
              />
              {/* Value chip anchored slightly beyond the vertex */}
              <text
                x={lab.x}
                y={lab.y - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="'Inter', system-ui, sans-serif"
                className="fill-ink-soft"
                style={{ letterSpacing: '0.04em' }}
              >
                {a}
              </text>
              <text
                x={lab.x}
                y={lab.y + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontFamily="'Space Grotesk', sans-serif"
                fontWeight={600}
                fill={color}
              >
                {values[i] ?? 0}%
              </text>
            </g>
          );
        })}

        {/* Centre AVG% badge — pulsing subtle ring, static number. */}
        <motion.circle
          cx={cx} cy={cy} r={26}
          fill="rgba(255,255,255,0.85)"
          stroke="#00d166"
          strokeOpacity={0.4}
          strokeWidth={1.5}
          animate={{ r: [26, 30, 26] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <text
          x={cx} y={cy - 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={18}
          fontWeight={700}
          fontFamily="'Space Grotesk', sans-serif"
          style={{ fill: '#0a0a1a' }}
        >
          {avg}
        </text>
        <text
          x={cx} y={cy + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7.5}
          letterSpacing="0.16em"
          fontFamily="'Space Grotesk', sans-serif"
          className="fill-muted"
          style={{ textTransform: 'uppercase' }}
        >
          avg %
        </text>
      </svg>
    </div>
  );
}
