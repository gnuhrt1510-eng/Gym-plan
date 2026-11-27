import { bestView, MUSCLE_LABEL, type MuscleId, type MuscleTargets } from '../data/muscles'

/**
 * Hình người dạng mảng ghép (mặt trước / sau). Toạ độ chỉ vẽ nửa phải (x ≥ 50),
 * nửa trái lấy đối xứng. viewBox 100 × 200.
 */
type Part = { id: MuscleId | null; pts: string }

const FRONT_PARTS: Part[] = [
  { id: 'traps', pts: '50,26 55,26 62,33 50,33' },
  { id: 'chest', pts: '50,34 61,33.5 63,40 66.5,46.5 63,53 55,55.5 50,54' },
  { id: 'frontDelt', pts: '61.5,33 68.5,33.5 71,44 67,47 63,40' },
  { id: 'sideDelt', pts: '69,33.5 74.5,36 78,45 74.5,51 71.5,44.5' },
  { id: 'biceps', pts: '67,48.5 74,51.5 76.5,61 73.5,70 68.5,68 66.5,58' },
  { id: 'forearm', pts: '68.5,69.5 74,71 79,85 77.5,96 72.5,96 69.5,84' },
  { id: null, pts: '72.5,97 78,97 80.5,104 76,108.5 71.5,104' },
  { id: 'abs', pts: '50,56.5 56.5,56.5 57,67 50,67' },
  { id: 'abs', pts: '50,68 57,68 57.5,79 50,79' },
  { id: 'abs', pts: '50,80 57.5,80 57,90 50,91.5' },
  { id: 'obliques', pts: '57.5,56.5 63.5,55 65,69 62.5,85 58.5,89.5 58.5,72' },
  { id: null, pts: '50,92.5 58,90.5 62.5,86.5 64.5,96 56,102 50,100' },
  { id: 'quads', pts: '56.5,103 64.5,97 68.5,105 68.5,124 64.5,140 57.5,140 53,124 52,109' },
  { id: 'quads', pts: '50,101 55.5,103.5 51.5,109 52.5,124 50.5,120' },
  { id: null, pts: '57.5,141 64.5,141 64.5,148 57.5,148' },
  { id: 'calves', pts: '57.5,149 64.5,149 66.5,160 64.5,180 60.5,182 57.5,170' },
  { id: null, pts: '58,183 64.5,183 68.5,190 57,191' },
]

const BACK_PARTS: Part[] = [
  { id: 'traps', pts: '50,24 55,24 66,33.5 60,40 50,48' },
  { id: 'rearDelt', pts: '66.5,34 72,34.5 75,40 72,47 66.5,44' },
  { id: 'sideDelt', pts: '72.5,34.5 76,37 78.5,45.5 74.5,51 72.5,47.5 75.5,40' },
  { id: 'midBack', pts: '50,48.5 60.5,40.5 66,44.5 63,56 50,58' },
  { id: 'lats', pts: '66.5,45.5 68.5,54 66.5,68 57.5,82 54.5,72 63.5,57' },
  { id: 'lowerBack', pts: '50,58.5 63,57 54,72 57,82 50,86' },
  { id: 'triceps', pts: '67,48.5 74,51.5 76.5,61 73.5,70 68.5,68 66.5,58' },
  { id: 'forearm', pts: '68.5,69.5 74,71 79,85 77.5,96 72.5,96 69.5,84' },
  { id: null, pts: '72.5,97 78,97 80.5,104 76,108.5 71.5,104' },
  { id: 'glutes', pts: '50,87.5 57.5,83 63.5,86 66.5,96 64.5,104 55,106.5 50,103' },
  { id: 'hamstrings', pts: '51.5,107.5 64.5,104.5 68.5,112 67.5,132 64.5,140 57.5,140 53,124' },
  { id: null, pts: '57.5,141 64.5,141 64.5,148 57.5,148' },
  { id: 'calves', pts: '57.5,149 65,149 67.5,160 65.5,176 60.5,180 57.5,168' },
  { id: null, pts: '58,181 64.5,181 66,190 57,191' },
]

function mirror(pts: string): string {
  return pts
    .split(' ')
    .map((p) => {
      const [x, y] = p.split(',').map(Number)
      return `${100 - x},${y}`
    })
    .join(' ')
}

/** Khung nhìn sát vùng cơ được tô (tỉ lệ rộng/cao = aspect) */
export function zoomBox(view: 'front' | 'back', ids: Set<MuscleId>, aspect = 0.8): [number, number, number, number] {
  const parts = (view === 'front' ? FRONT_PARTS : BACK_PARTS).filter((p) => p.id && ids.has(p.id))
  if (parts.length === 0) return [16, 0, 68, 194]
  const xs: number[] = []
  const ys: number[] = []
  for (const p of parts)
    for (const pt of p.pts.split(' ')) {
      const [x, y] = pt.split(',').map(Number)
      xs.push(x)
      ys.push(y)
    }
  let minX = Math.min(...xs)
  let maxX = Math.max(...xs)
  // Cơ ở giữa thân (ngực, bụng, lưng…) → lấy cả hai bên; cơ ở tay/chân → một bên là đủ
  if (minX < 56) minX = 100 - maxX
  const pad = 7
  let x0 = minX - pad
  let x1 = maxX + pad
  let y0 = Math.min(...ys) - pad
  let y1 = Math.max(...ys) + pad
  // đủ lớn để còn thấy vùng xung quanh, rồi chỉnh theo tỉ lệ khung
  const minH = 48
  if (y1 - y0 < minH) {
    const c = (y0 + y1) / 2
    y0 = c - minH / 2
    y1 = c + minH / 2
  }
  let w = x1 - x0
  let h = y1 - y0
  if (w / h < aspect) {
    const nw = h * aspect
    x0 -= (nw - w) / 2
    w = nw
  } else {
    const nh = w / aspect
    y0 -= (nh - h) / 2
    h = nh
  }
  x1 = x0 + w
  y1 = y0 + h
  // giữ trong hình
  if (y0 < -4) {
    y1 -= y0 + 4
    y0 = -4
  }
  if (y1 > 196) {
    y0 -= y1 - 196
    y1 = 196
  }
  return [x0, y0, x1 - x0, y1 - y0]
}

function Figure({
  view,
  primary,
  secondary,
  size,
  label,
  zoom,
}: {
  view: 'front' | 'back'
  primary: Set<MuscleId>
  secondary: Set<MuscleId>
  size: number
  label?: boolean
  zoom?: boolean
}) {
  const parts = view === 'front' ? FRONT_PARTS : BACK_PARTS
  const cls = (id: MuscleId | null) => (id && primary.has(id) ? 'mm-p' : id && secondary.has(id) ? 'mm-s' : 'mm-o')
  const box = zoom ? zoomBox(view, primary.size ? primary : secondary) : [16, 0, 68, 194]
  const width = zoom ? size * 0.8 : size * 0.35
  return (
    <figure className={`mm-fig ${zoom ? 'zoomed' : ''}`}>
      <svg viewBox={box.map((n) => n.toFixed(1)).join(' ')} width={width} height={size} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <ellipse cx="50" cy="13.5" rx="8" ry="10" className="mm-o" />
        {parts.map((p, i) => (
          <g key={i} className={cls(p.id)}>
            <polygon points={p.pts} />
            <polygon points={mirror(p.pts)} />
          </g>
        ))}
      </svg>
      {label && <figcaption>{view === 'front' ? 'Trước' : 'Sau'}</figcaption>}
    </figure>
  )
}

export default function MuscleMap({
  targets,
  muscles,
  views = 'auto',
  size = 120,
  labels = false,
  legend = false,
  figures = true,
  zoom = false,
}: {
  targets?: MuscleTargets
  /** tô một danh sách cơ như cơ chính (dùng cho thẻ nhóm cơ) */
  muscles?: MuscleId[]
  views?: 'auto' | 'both' | 'front' | 'back'
  size?: number
  labels?: boolean
  legend?: boolean
  /** false = chỉ hiện chú thích */
  figures?: boolean
  /** phóng to vào vùng cơ được tô */
  zoom?: boolean
}) {
  const tg = targets ?? { primary: muscles ?? [], secondary: [] }
  const primary = new Set(tg.primary)
  const secondary = new Set(tg.secondary.filter((m) => !primary.has(m)))
  const list: ('front' | 'back')[] = views === 'both' ? ['front', 'back'] : views === 'auto' ? [bestView(tg)] : [views]
  const title = [...primary].map((m) => MUSCLE_LABEL[m]).join(', ')
  return (
    <div className="muscle-map" role="img" aria-label={title ? `Cơ tác động: ${title}` : 'Hình nhóm cơ'}>
      {figures && (
      <div className="mm-figs">
        {list.map((v) => (
          <Figure key={v} view={v} primary={primary} secondary={secondary} size={size} label={labels} zoom={zoom} />
        ))}
      </div>
      )}
      {legend && (
        <div className="mm-legend small">
          {tg.primary.length > 0 && (
            <span>
              <i className="mm-dot p" /> {tg.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}
            </span>
          )}
          {[...secondary].length > 0 && (
            <span className="muted">
              <i className="mm-dot s" /> {[...secondary].map((m) => MUSCLE_LABEL[m]).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
