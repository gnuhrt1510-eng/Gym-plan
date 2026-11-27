import { useCallback, useEffect, useRef, useState } from 'react'
import { acceptPoint, defaultTitle, estimateKcal, estimateSteps, StepDetector, thinPoints, totalDistance, type Run, type RunPoint } from './run'

const DRAFT_KEY = 'gymplan:run-draft:v1'

export interface RunDraft {
  status: 'recording' | 'paused'
  startedAt: number
  /** thời gian chạy đã cộng dồn trước lần tiếp tục gần nhất */
  activeMs: number
  /** thời điểm (wall clock) bắt đầu đoạn đang chạy; null khi tạm dừng */
  resumedAt: number | null
  seg: number
  points: RunPoint[]
  steps: number
  motion: boolean
}

export type GpsState = { kind: 'waiting' } | { kind: 'ok'; accuracy: number } | { kind: 'weak'; accuracy: number } | { kind: 'error'; message: string }

function loadDraft(): RunDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as RunDraft) : null
  } catch {
    return null
  }
}
function saveDraft(d: RunDraft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* bộ nhớ đầy hoặc bị chặn: vẫn chạy tiếp trong RAM */
  }
}

export function elapsedOf(d: RunDraft, now = Date.now()): number {
  return d.activeMs + (d.resumedAt ? now - d.resumedAt : 0)
}

const GEO_ERRORS: Record<number, string> = {
  1: 'Chưa cho phép truy cập vị trí. Mở cài đặt trình duyệt → cho phép Vị trí cho trang này.',
  2: 'Không lấy được vị trí. Ra chỗ thoáng, bật GPS/Vị trí của điện thoại.',
  3: 'GPS phản hồi chậm, đang thử lại…',
}

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> }

export function useRunRecorder() {
  const [draft, setDraft] = useState<RunDraft | null>(loadDraft)
  const [gps, setGps] = useState<GpsState>({ kind: 'waiting' })
  const [, setTick] = useState(0)
  const ref = useRef<RunDraft | null>(draft)
  const watchId = useRef<number | null>(null)
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null)
  const detector = useRef(new StepDetector())
  const lastSave = useRef(0)

  const commit = useCallback((d: RunDraft | null, force = false) => {
    ref.current = d
    setDraft(d ? { ...d } : null)
    const now = Date.now()
    if (force || now - lastSave.current > 3000) {
      saveDraft(d)
      lastSave.current = now
    }
  }, [])

  const onPosition = useCallback(
    (pos: GeolocationPosition) => {
      const acc = pos.coords.accuracy
      setGps(acc <= 20 ? { kind: 'ok', accuracy: acc } : { kind: 'weak', accuracy: acc })
      const d = ref.current
      if (!d || d.status !== 'recording') return
      const t = elapsedOf(d)
      const prev = d.points[d.points.length - 1]
      const sameSeg = prev && prev[3] === d.seg ? prev : undefined
      if (acceptPoint(sameSeg, pos.coords.latitude, pos.coords.longitude, t, acc) === 'skip') return
      d.points.push([pos.coords.latitude, pos.coords.longitude, t, d.seg])
      commit(d)
    },
    [commit],
  )

  const onMotion = useCallback(
    (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      const d = ref.current
      if (!a || a.x == null || a.y == null || a.z == null || !d) return
      if (!d.motion) d.motion = true
      if (d.status !== 'recording') return
      if (detector.current.push(a.x, a.y, a.z, e.timeStamp)) {
        d.steps++
        commit(d)
      }
    },
    [commit],
  )

  const acquireWakeLock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
      wakeLock.current = (await nav.wakeLock?.request('screen')) ?? null
    } catch {
      wakeLock.current = null
    }
  }, [])

  const startSensors = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGps({ kind: 'error', message: 'Trình duyệt này không hỗ trợ định vị.' })
      return
    }
    if (watchId.current === null) {
      watchId.current = navigator.geolocation.watchPosition(
        onPosition,
        (err) => setGps(err.code === 3 ? { kind: 'waiting' } : { kind: 'error', message: GEO_ERRORS[err.code] ?? err.message }),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      )
    }
    window.addEventListener('devicemotion', onMotion)
    void acquireWakeLock()
  }, [onPosition, onMotion, acquireWakeLock])

  const stopSensors = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    window.removeEventListener('devicemotion', onMotion)
    void wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
  }, [onMotion])

  // Tiếp tục bản nháp sau khi tải lại trang
  useEffect(() => {
    if (ref.current) startSensors()
    return stopSensors
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đồng hồ cập nhật mỗi giây + giữ màn hình sáng khi quay lại app
  useEffect(() => {
    if (!draft) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    const onVis = () => {
      if (document.visibilityState === 'visible' && ref.current) void acquireWakeLock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [draft !== null, acquireWakeLock]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Gọi trực tiếp từ cú bấm (iOS chỉ cho xin quyền cảm biến trong cú bấm) */
  const start = useCallback(async () => {
    const DM = (window as unknown as { DeviceMotionEvent?: MotionPermission }).DeviceMotionEvent
    const permission = DM?.requestPermission?.().catch(() => 'denied' as const)
    detector.current = new StepDetector()
    const now = Date.now()
    commit({ status: 'recording', startedAt: now, activeMs: 0, resumedAt: now, seg: 0, points: [], steps: 0, motion: false }, true)
    setGps({ kind: 'waiting' })
    startSensors()
    await permission
  }, [commit, startSensors])

  const pause = useCallback(() => {
    const d = ref.current
    if (!d || d.status !== 'recording') return
    const now = Date.now()
    commit({ ...d, status: 'paused', activeMs: elapsedOf(d, now), resumedAt: null, seg: d.seg + 1 }, true)
  }, [commit])

  const resume = useCallback(() => {
    const d = ref.current
    if (!d || d.status !== 'paused') return
    commit({ ...d, status: 'recording', resumedAt: Date.now() }, true)
  }, [commit])

  const finish = useCallback(
    (profile: { weightKg: number; heightCm: number }): Run | null => {
      const d = ref.current
      if (!d) return null
      const durationMs = elapsedOf(d)
      const points = thinPoints(d.points)
      const distanceM = totalDistance(d.points)
      const useSensor = d.motion && d.steps > 0
      stopSensors()
      commit(null, true)
      return {
        id: Math.random().toString(36).slice(2, 10) + d.startedAt.toString(36),
        title: defaultTitle(d.startedAt),
        startedAt: d.startedAt,
        durationMs,
        distanceM,
        steps: useSensor ? d.steps : estimateSteps(distanceM, durationMs, profile.heightCm),
        stepsEstimated: !useSensor,
        kcal: estimateKcal(distanceM, durationMs, profile.weightKg),
        points,
        source: 'gps',
      }
    },
    [commit, stopSensors],
  )

  const discard = useCallback(() => {
    stopSensors()
    commit(null, true)
  }, [commit, stopSensors])

  return { draft, gps, start, pause, resume, finish, discard }
}
