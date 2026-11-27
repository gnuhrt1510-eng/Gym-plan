import { useState } from 'react'
import { fitView, project, type RunPoint } from '../lib/run'

const TILE = 256

/**
 * Bản đồ tĩnh: ô bản đồ OpenStreetMap (lọc màu tối) + đường chạy vẽ bằng SVG.
 * Nếu ô bản đồ không tải được (offline, bị chặn) vẫn còn đường chạy trên nền tối.
 */
export default function RouteMap({
  points,
  width = 360,
  height = 260,
  tiles = true,
  live = false,
  className = '',
}: {
  points: RunPoint[]
  width?: number
  height?: number
  tiles?: boolean
  live?: boolean
  className?: string
}) {
  const [tileFail, setTileFail] = useState(false)
  const view = fitView(points, width, height, 0.14, live ? 17 : 16)
  const z = view.zoom
  const toXY = (p: RunPoint) => {
    const [x, y] = project(p[0], p[1], z)
    return [x - view.x0, y - view.y0] as const
  }

  // Tách đường theo đoạn (tạm dừng thì không nối)
  const segs: string[] = []
  let cur: string[] = []
  points.forEach((p, i) => {
    if (i > 0 && p[3] !== points[i - 1][3]) {
      segs.push(cur.join(' '))
      cur = []
    }
    const [x, y] = toXY(p)
    cur.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  })
  if (cur.length) segs.push(cur.join(' '))

  const tileEls: { key: string; href: string; x: number; y: number }[] = []
  if (tiles && points.length > 0 && !tileFail) {
    const n = 2 ** z
    const tx0 = Math.floor(view.x0 / TILE)
    const ty0 = Math.floor(view.y0 / TILE)
    const tx1 = Math.floor((view.x0 + width) / TILE)
    const ty1 = Math.floor((view.y0 + height) / TILE)
    for (let tx = tx0; tx <= tx1; tx++)
      for (let ty = ty0; ty <= ty1; ty++) {
        if (ty < 0 || ty >= n) continue
        const wx = ((tx % n) + n) % n
        tileEls.push({ key: `${z}/${tx}/${ty}`, href: `https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`, x: tx * TILE - view.x0, y: ty * TILE - view.y0 })
      }
  }

  const first = points[0]
  const last = points[points.length - 1]

  return (
    <div className={`route-map ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bản đồ đường chạy">
        <rect width={width} height={height} className="rm-bg" />
        {tileEls.length > 0 && (
          <g className="rm-tiles">
            {tileEls.map((t) => (
              <image key={t.key} href={t.href} x={t.x} y={t.y} width={TILE + 0.5} height={TILE + 0.5} onError={() => setTileFail(true)} />
            ))}
          </g>
        )}
        {segs.map((s, i) => (
          <g key={i}>
            <polyline points={s} className="rm-glow" fill="none" />
            <polyline points={s} className="rm-line" fill="none" />
          </g>
        ))}
        {first && (
          <circle cx={toXY(first)[0]} cy={toXY(first)[1]} r={5} className="rm-start">
            <title>Xuất phát</title>
          </circle>
        )}
        {last && points.length > 1 && (
          <circle cx={toXY(last)[0]} cy={toXY(last)[1]} r={live ? 7 : 5} className={live ? 'rm-now' : 'rm-end'}>
            <title>{live ? 'Vị trí hiện tại' : 'Kết thúc'}</title>
          </circle>
        )}
      </svg>
      {tileEls.length > 0 && <span className="rm-attr">© OpenStreetMap</span>}
      {points.length === 0 && <span className="rm-empty">Đang chờ tín hiệu GPS…</span>}
    </div>
  )
}
