/** Logic thuần cho phần chạy bộ — không phụ thuộc trình duyệt để test được. */

/** [lat, lon, tMs, seg] — tMs là thời gian CHẠY (đã trừ lúc tạm dừng), seg tăng sau mỗi lần dừng */
export type RunPoint = [number, number, number, number]

export interface Run {
  id: string
  title: string
  startedAt: number
  durationMs: number
  distanceM: number
  steps: number
  stepsEstimated: boolean
  kcal: number
  points: RunPoint[]
  source: 'gps' | 'gpx'
}

const R = 6371008.8

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLon = (lon2 - lon1) * toRad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

export const MAX_ACCURACY_M = 35
const MIN_MOVE_M = 3
const MAX_SPEED_MS = 12

/**
 * Quyết định có nhận điểm GPS mới không:
 *  - bỏ điểm sai số lớn
 *  - bỏ "nhảy" phi lý (> 12 m/s ≈ 43 km/h)
 *  - bỏ rung tại chỗ (< 3 m) để quãng đường không tự tăng khi đứng yên
 */
export function acceptPoint(prev: RunPoint | undefined, lat: number, lon: number, t: number, accuracy: number): 'accept' | 'skip' {
  if (accuracy > MAX_ACCURACY_M) return 'skip'
  if (!prev) return 'accept'
  const d = haversine(prev[0], prev[1], lat, lon)
  if (d < MIN_MOVE_M) return 'skip'
  const dt = Math.max(1, t - prev[2]) / 1000
  if (d / dt > MAX_SPEED_MS) return 'skip'
  return 'accept'
}

/** Tổng quãng đường (m), không nối giữa các đoạn bị tạm dừng */
export function totalDistance(points: RunPoint[]): number {
  let d = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i][3] !== points[i - 1][3]) continue
    d += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
  }
  return d
}

/** Thời gian (ms) cho mỗi km trọn vẹn, nội suy tại mốc km */
export function splits(points: RunPoint[]): number[] {
  const out: number[] = []
  let cum = 0
  let nextKm = 1000
  let lastT = points[0]?.[2] ?? 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a[3] !== b[3]) continue
    const d = haversine(a[0], a[1], b[0], b[1])
    while (cum + d >= nextKm && d > 0) {
      const f = (nextKm - cum) / d
      const t = a[2] + f * (b[2] - a[2])
      out.push(t - lastT)
      lastT = t
      nextKm += 1000
    }
    cum += d
  }
  return out
}

/** Pace hiện tại: tốc độ trong ~30 giây chạy gần nhất (giây/km), null nếu chưa đủ dữ liệu */
export function currentPace(points: RunPoint[], windowMs = 30000): number | null {
  if (points.length < 2) return null
  const last = points[points.length - 1]
  let d = 0
  let i = points.length - 1
  while (i > 0 && last[2] - points[i - 1][2] <= windowMs) {
    if (points[i][3] === points[i - 1][3]) d += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    i--
  }
  const dt = last[2] - points[i][2]
  if (d < 20 || dt < 5000) return null
  return dt / 1000 / (d / 1000)
}

export function paceSecPerKm(distanceM: number, durationMs: number): number | null {
  if (distanceM < 50) return null
  return durationMs / 1000 / (distanceM / 1000)
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null || !isFinite(secPerKm) || secPerKm > 60 * 30) return '–:––'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export function formatKm(m: number): string {
  return (m / 1000).toFixed(2)
}

/** Ước tính bước khi điện thoại không cho đọc cảm biến: độ dài bước theo chiều cao và tốc độ */
export function estimateSteps(distanceM: number, durationMs: number, heightCm: number): number {
  if (distanceM <= 0) return 0
  const speed = durationMs > 0 ? distanceM / (durationMs / 1000) : 2.5
  const h = heightCm / 100
  const stepLen = speed < 2.2 ? 0.414 * h : 0.65 * h
  return Math.round(distanceM / stepLen)
}

/** Calo ước tính: chạy ≈ 1 kcal/kg/km, đi bộ ≈ 0.55 */
export function estimateKcal(distanceM: number, durationMs: number, weightKg: number): number {
  const speed = durationMs > 0 ? distanceM / (durationMs / 1000) : 0
  const factor = speed < 2.2 ? 0.55 : 1.0
  return Math.round(weightKg * (distanceM / 1000) * factor)
}

/**
 * Đếm bước từ gia tốc kế: làm mượt độ lớn gia tốc, đếm đỉnh vượt ngưỡng
 * với khoảng cách tối thiểu 250 ms (≤ 240 bước/phút).
 */
export class StepDetector {
  steps = 0
  private smooth = 9.81
  private baseline = 9.81
  private above = false
  private lastStep = 0
  constructor(private threshold = 1.3) {}
  push(ax: number, ay: number, az: number, tMs: number): boolean {
    const mag = Math.sqrt(ax * ax + ay * ay + az * az)
    this.smooth = this.smooth * 0.75 + mag * 0.25
    this.baseline = this.baseline * 0.98 + mag * 0.02
    const high = this.smooth > this.baseline + this.threshold
    let counted = false
    if (high && !this.above && tMs - this.lastStep > 250) {
      this.steps++
      this.lastStep = tMs
      counted = true
    }
    if (high) this.above = true
    else if (this.smooth < this.baseline + this.threshold * 0.4) this.above = false
    return counted
  }
}

/** Đọc GPX (Strava, Garmin, điện thoại…) thành điểm chạy */
export function parseGpx(xml: string): { points: RunPoint[]; startedAt: number; name: string } | null {
  const re = /<trkpt[^>]*?lat="([-\d.]+)"[^>]*?lon="([-\d.]+)"[^>]*?>([\s\S]*?)<\/trkpt>|<trkpt[^>]*?lon="([-\d.]+)"[^>]*?lat="([-\d.]+)"[^>]*?>([\s\S]*?)<\/trkpt>/g
  const raw: { lat: number; lon: number; time: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const lat = Number(m[1] ?? m[5])
    const lon = Number(m[2] ?? m[4])
    const body = m[3] ?? m[6] ?? ''
    const tm = body.match(/<time>([^<]+)<\/time>/)
    const time = tm ? Date.parse(tm[1]) : NaN
    if (isFinite(lat) && isFinite(lon)) raw.push({ lat, lon, time })
  }
  if (raw.length < 2) return null
  const hasTime = raw.every((p) => isFinite(p.time))
  const t0 = hasTime ? raw[0].time : 0
  const points: RunPoint[] = raw.map((p, i) => [p.lat, p.lon, hasTime ? p.time - t0 : i * 1000, 0])
  const name = xml.match(/<name>([^<]{1,80})<\/name>/)?.[1]?.trim() ?? ''
  return { points, startedAt: hasTime ? t0 : Date.now(), name }
}

/** Bỏ bớt điểm sát nhau (< minGap m) để lưu nhẹ hơn, giữ điểm đầu/cuối và điểm đổi đoạn */
export function thinPoints(points: RunPoint[], minGap = 5): RunPoint[] {
  if (points.length <= 2) return points
  const out: RunPoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1]
    const p = points[i]
    if (p[3] !== last[3] || points[i + 1][3] !== p[3] || haversine(last[0], last[1], p[0], p[1]) >= minGap) out.push(p)
  }
  out.push(points[points.length - 1])
  return out.map((p) => [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6, Math.round(p[2]), p[3]])
}

export function defaultTitle(startedAt: number): string {
  const h = new Date(startedAt).getHours()
  const part = h < 11 ? 'sáng' : h < 14 ? 'trưa' : h < 18 ? 'chiều' : 'tối'
  return `Chạy buổi ${part}`
}

/* ---------- bản đồ: phép chiếu Web Mercator ---------- */

export function project(lat: number, lon: number, zoom: number): [number, number] {
  const scale = 256 * 2 ** zoom
  const x = ((lon + 180) / 360) * scale
  const s = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale
  return [x, y]
}

export interface MapView {
  zoom: number
  /** toạ độ pixel thế giới của góc trên-trái khung */
  x0: number
  y0: number
  width: number
  height: number
}

/** Chọn zoom lớn nhất mà cả tuyến đường vừa khung (có lề) */
export function fitView(points: RunPoint[], width: number, height: number, pad = 0.12, maxZoom = 17): MapView {
  if (points.length === 0) return { zoom: 3, x0: 0, y0: 0, width, height }
  for (let z = maxZoom; z >= 2; z--) {
    const xy = points.map((p) => project(p[0], p[1], z))
    const xs = xy.map((p) => p[0])
    const ys = xy.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    if (maxX - minX <= width * (1 - 2 * pad) && maxY - minY <= height * (1 - 2 * pad)) {
      return { zoom: z, x0: (minX + maxX) / 2 - width / 2, y0: (minY + maxY) / 2 - height / 2, width, height }
    }
  }
  const [x, y] = project(points[0][0], points[0][1], 2)
  return { zoom: 2, x0: x - width / 2, y0: y - height / 2, width, height }
}
