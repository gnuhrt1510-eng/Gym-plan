interface Point {
  label: string
  value: number
}

interface Series {
  name: string
  points: Point[]
  className: string
}

/** Biểu đồ đường SVG gọn nhẹ — không cần thư viện */
export default function LineChart({ series, unit = 'kg', height = 180 }: { series: Series[]; unit?: string; height?: number }) {
  const all = series.flatMap((s) => s.points)
  if (all.length === 0) return <p className="muted small">Chưa có dữ liệu.</p>

  const W = 320
  const H = height
  const pad = { l: 36, r: 10, t: 12, b: 24 }
  const n = Math.max(...series.map((s) => s.points.length))
  const values = all.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 5
    max += 5
  }
  const span = max - min
  min -= span * 0.1
  max += span * 0.1

  const x = (i: number) => pad.l + (n <= 1 ? (W - pad.l - pad.r) / 2 : (i / (n - 1)) * (W - pad.l - pad.r))
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)
  const ticks = [min, (min + max) / 2, max]
  const labels = series[0].points

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ tiến độ">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="axis">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {labels.length > 0 && (
          <>
            <text x={x(0)} y={H - 6} textAnchor="start" className="axis">
              {labels[0].label}
            </text>
            {labels.length > 1 && (
              <text x={x(labels.length - 1)} y={H - 6} textAnchor="end" className="axis">
                {labels[labels.length - 1].label}
              </text>
            )}
          </>
        )}
        {series.map((s) => (
          <g key={s.name} className={s.className}>
            <polyline fill="none" strokeWidth={2} strokeLinejoin="round" points={s.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} />
            {s.points.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p.value)} r={3}>
                <title>
                  {p.label}: {p.value.toFixed(1)} {unit}
                </title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.name} className={s.className}>
              <i /> {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
