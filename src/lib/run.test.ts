import { describe, expect, it } from 'vitest'
import {
  acceptPoint,
  currentPace,
  estimateSteps,
  fitView,
  formatDuration,
  formatPace,
  haversine,
  parseGpx,
  splits,
  StepDetector,
  thinPoints,
  totalDistance,
  type RunPoint,
} from './run'

// 1 độ vĩ ≈ 111 195 m → 0.0009 độ ≈ 100 m
const north = (i: number, sec: number, seg = 0): RunPoint => [21.0 + i * 0.0009, 105.8, sec * 1000, seg]

describe('run math', () => {
  it('haversine ~100 m', () => {
    expect(haversine(21, 105.8, 21.0009, 105.8)).toBeCloseTo(100.08, 0)
  })

  it('cộng quãng đường, bỏ qua đoạn nối khi tạm dừng', () => {
    const pts = [north(0, 0), north(1, 30), north(2, 60, 1), north(3, 90, 1)]
    expect(totalDistance(pts)).toBeCloseTo(200, -1)
  })

  it('chia km với pace đều 5:00/km', () => {
    const pts = Array.from({ length: 31 }, (_, i) => north(i, i * 30)) // 100 m mỗi 30 s
    const sp = splits(pts)
    expect(sp.length).toBe(3)
    for (const s of sp) expect(s / 1000).toBeCloseTo(300, -1)
    expect(formatPace(currentPace(pts))).toBe('5:00')
  })

  it('lọc điểm GPS xấu', () => {
    const prev = north(0, 0)
    expect(acceptPoint(prev, 21.0009, 105.8, 30000, 50)).toBe('skip') // sai số lớn
    expect(acceptPoint(prev, 21.00001, 105.8, 30000, 5)).toBe('skip') // rung tại chỗ
    expect(acceptPoint(prev, 21.009, 105.8, 10000, 5)).toBe('skip') // 1 km trong 10 s
    expect(acceptPoint(prev, 21.0009, 105.8, 30000, 5)).toBe('accept')
  })

  it('định dạng', () => {
    expect(formatDuration(65000)).toBe('1:05')
    expect(formatDuration(3725000)).toBe('1:02:05')
    expect(formatPace(null)).toBe('–:––')
    expect(formatPace(359.6)).toBe('6:00')
  })

  it('ước tính bước theo chiều cao', () => {
    // 5 km chạy 25 phút, cao 170 cm → bước ~1.1 m → ~4500 bước
    expect(estimateSteps(5000, 25 * 60000, 170)).toBeGreaterThan(4000)
    expect(estimateSteps(5000, 25 * 60000, 170)).toBeLessThan(5000)
  })

  it('đếm bước từ gia tốc giả lập 2.8 bước/giây', () => {
    const det = new StepDetector()
    const hz = 50
    for (let i = 0; i < hz * 10; i++) {
      const t = (i / hz) * 1000
      const z = 9.81 + 4 * Math.sin(2 * Math.PI * 2.8 * (i / hz))
      det.push(0, 0, z, t)
    }
    expect(det.steps).toBeGreaterThanOrEqual(25)
    expect(det.steps).toBeLessThanOrEqual(30)
  })

  it('đọc GPX', () => {
    const gpx = `<gpx><trk><name>Chạy hồ Tây</name><trkseg>
      <trkpt lat="21.0" lon="105.8"><time>2026-11-27T06:00:00Z</time></trkpt>
      <trkpt lon="105.8" lat="21.0009"><ele>5</ele><time>2026-11-27T06:00:30Z</time></trkpt>
    </trkseg></trk></gpx>`
    const r = parseGpx(gpx)!
    expect(r.name).toBe('Chạy hồ Tây')
    expect(r.points.length).toBe(2)
    expect(r.points[1][2]).toBe(30000)
    expect(totalDistance(r.points)).toBeCloseTo(100, -1)
  })

  it('giảm điểm mà giữ quãng đường', () => {
    const dense: RunPoint[] = Array.from({ length: 201 }, (_, i) => [21 + i * 0.000009, 105.8, i * 1000, 0])
    const thin = thinPoints(dense)
    expect(thin.length).toBeLessThan(60)
    expect(totalDistance(thin)).toBeCloseTo(totalDistance(dense), -1)
  })

  it('fitView chọn zoom để vừa khung', () => {
    const pts = Array.from({ length: 31 }, (_, i) => north(i, i))
    const v = fitView(pts, 360, 360)
    expect(v.zoom).toBeGreaterThanOrEqual(13)
    expect(v.zoom).toBeLessThanOrEqual(15)
  })
})
