import { BODY, BODY_VIEWBOX } from '../data/bodyPaths'
import { bestView, MUSCLE_LABEL, type MuscleId, type MuscleTargets } from '../data/muscles'

type View = 'front' | 'back'

/** Cơ của app → vùng trên hình giải phẫu (mỗi mặt) */
const SLUGS: Record<View, Partial<Record<MuscleId, string[]>>> = {
  front: {
    chest: ['chest'],
    frontDelt: ['deltoids'],
    sideDelt: ['deltoids'],
    traps: ['trapezius'],
    biceps: ['biceps'],
    triceps: ['triceps'],
    forearm: ['forearm'],
    abs: ['abs'],
    obliques: ['obliques'],
    quads: ['quadriceps'],
    calves: ['calves'],
  },
  back: {
    traps: ['trapezius'],
    rearDelt: ['deltoids'],
    sideDelt: ['deltoids'],
    lats: ['upper-back'],
    midBack: ['upper-back'],
    lowerBack: ['lower-back'],
    triceps: ['triceps'],
    forearm: ['forearm'],
    glutes: ['gluteal'],
    hamstrings: ['hamstring'],
    calves: ['calves'],
  },
}

/** Vùng có ở cả hai bên tay/chân: phóng to chỉ cần một bên */
const LIMB = new Set(['biceps', 'triceps', 'forearm', 'deltoids', 'quadriceps', 'hamstring', 'calves', 'tibialis', 'adductors'])
/** Phần không phải cơ (đầu, tay, chân…) tô tối hơn */
const BASE = new Set(['head', 'hair', 'hands', 'feet', 'ankles', 'knees', 'neck'])

function slugsFor(view: View, ids: Iterable<MuscleId>): Set<string> {
  const out = new Set<string>()
  for (const id of ids) for (const s of SLUGS[view][id] ?? []) out.add(s)
  return out
}

/** Khung nhìn sát vùng được tô, tỉ lệ rộng/cao = aspect */
export function zoomBox(view: View, ids: Set<MuscleId>, aspect = 0.8): [number, number, number, number] {
  const [vx, vy, vw, vh] = BODY_VIEWBOX[view]
  const slugs = [...slugsFor(view, ids)]
  if (slugs.length === 0) return [vx, vy, vw, vh]
  const center = vx + vw / 2
  const oneSide = slugs.every((s) => LIMB.has(s))
  let boxes = slugs.flatMap((s) => BODY[view][s]?.boxes ?? [])
  if (oneSide) {
    const right = boxes.filter((b) => (b[0] + b[2]) / 2 > center)
    if (right.length) boxes = right
  }
  if (boxes.length === 0) return [vx, vy, vw, vh]
  const pad = 36
  let x0 = Math.min(...boxes.map((b) => b[0])) - pad
  let x1 = Math.max(...boxes.map((b) => b[2])) + pad
  let y0 = Math.min(...boxes.map((b) => b[1])) - pad
  let y1 = Math.max(...boxes.map((b) => b[3])) + pad
  const minH = 300
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
  if (y0 < vy + 80) {
    y1 += vy + 80 - y0
    y0 = vy + 80
  }
  if (y1 > vy + 1360) {
    y0 -= y1 - (vy + 1360)
    y1 = vy + 1360
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
  view: View
  primary: Set<MuscleId>
  secondary: Set<MuscleId>
  size: number
  label?: boolean
  zoom?: boolean
}) {
  const p = slugsFor(view, primary)
  const s = slugsFor(view, secondary)
  const full = BODY_VIEWBOX[view]
  // Toàn thân: bỏ bớt khoảng trống trên đầu/dưới chân
  const vb = zoom ? zoomBox(view, primary.size ? primary : secondary) : [full[0] + 40, 80, full[2] - 80, 1290]
  const width = size * (vb[2] / vb[3])
  return (
    <figure className={`mm-fig ${zoom ? 'zoomed' : ''}`}>
      <svg viewBox={vb.map((n) => n.toFixed(1)).join(' ')} width={width} height={size} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        {Object.entries(BODY[view]).map(([slug, part]) => (
          <g key={slug} className={p.has(slug) ? 'mm-p' : s.has(slug) ? 'mm-s' : BASE.has(slug) ? 'mm-b' : 'mm-o'}>
            {part.d.map((d, i) => (
              <path key={i} d={d} />
            ))}
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
  const list: View[] = views === 'both' ? ['front', 'back'] : views === 'auto' ? [bestView(tg)] : [views]
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
