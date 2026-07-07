/**
 * SparkLine — tiny inline SVG line chart, dependency-free.
 *
 *   Designed to sit inside a KPI card. Renders a smooth area + line + last dot.
 *   Pass values 0..N, choose color, optionally fill the area.
 */
type Props = {
  values: number[];
  color:  string;
  width?:  number;
  height?: number;
  filled?: boolean;
  showDot?: boolean;
};

export default function SparkLine({
  values,
  color,
  width = 120,
  height = 36,
  filled = true,
  showDot = true,
}: Props) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);

  const stepX = values.length === 1 ? 0 : width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L ${width.toFixed(1)} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} aria-hidden className="block">
      {filled && (
        <>
          <defs>
            <linearGradient id={`g-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.40" />
              <stop offset="100%" stopColor={color} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#g-${color.replace(/[^a-z0-9]/gi, '')})`} />
        </>
      )}
      <path d={line} stroke={color} strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showDot && (
        <circle cx={last[0]} cy={last[1]} r={2.5} fill={color}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      )}
    </svg>
  );
}
