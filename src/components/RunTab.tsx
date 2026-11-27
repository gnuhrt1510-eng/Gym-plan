import { useEffect, useMemo, useState } from 'react'
import { addDays, startOfWeek, toISODate, today } from '../lib/date'
import {
  currentPace,
  defaultTitle,
  estimateKcal,
  estimateSteps,
  formatDuration,
  formatKm,
  formatPace,
  paceSecPerKm,
  parseGpx,
  splits,
  thinPoints,
  totalDistance,
  type Run,
} from '../lib/run'
import { renderStory, shareOrSave, type StoryVariant } from '../lib/story'
import { elapsedOf, useRunRecorder, type GpsState } from '../lib/useRunRecorder'
import ConfirmButton from './ConfirmButton'
import { IconPlay } from './Icons'
import RouteMap from './RouteMap'

const RUNS_KEY = 'gymplan:runs:v1'
const inFrame = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()

function loadRuns(): Run[] {
  try {
    const raw = localStorage.getItem(RUNS_KEY)
    return raw ? (JSON.parse(raw) as Run[]) : []
  } catch {
    return []
  }
}

function useRuns() {
  const [runs, setRuns] = useState<Run[]>(loadRuns)
  useEffect(() => {
    try {
      localStorage.setItem(RUNS_KEY, JSON.stringify(runs))
    } catch {
      /* đầy bộ nhớ */
    }
  }, [runs])
  return [runs, setRuns] as const
}

const runDay = (r: Run) => toISODate(new Date(r.startedAt))
function fmtWhen(ts: number) {
  const d = new Date(ts)
  const iso = toISODate(d)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (iso === today()) return `Hôm nay, ${hm}`
  if (iso === addDays(today(), -1)) return `Hôm qua, ${hm}`
  return `${d.getDate()}/${d.getMonth() + 1}, ${hm}`
}

/** Chiều cao, cân nặng lấy (chỉ đọc) từ phần Cài đặt để ước tính bước & calo */
export default function RunTab({ body }: { body: { weightKg: number; heightCm: number } }) {
  const [runs, setRuns] = useRuns()
  const rec = useRunRecorder()
  const [openId, setOpenId] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState('')

  const open = runs.find((r) => r.id === openId) ?? null

  if (rec.draft) {
    return (
      <Recording
        rec={rec}
        body={body}
        onSaved={(run) => {
          setRuns((rs) => [run, ...rs])
          setOpenId(run.id)
        }}
      />
    )
  }

  if (open) {
    return (
      <RunDetail
        run={open}
        onBack={() => setOpenId(null)}
        onRename={(title) => setRuns((rs) => rs.map((r) => (r.id === open.id ? { ...r, title } : r)))}
        onDelete={() => {
          setRuns((rs) => rs.filter((r) => r.id !== open.id))
          setOpenId(null)
        }}
      />
    )
  }

  const weekStart = startOfWeek(today())
  const week = runs.filter((r) => runDay(r) >= weekStart)
  const weekKm = week.reduce((s, r) => s + r.distanceM, 0) / 1000
  const totalKm = runs.reduce((s, r) => s + r.distanceM, 0) / 1000
  const best = runs.filter((r) => r.distanceM >= 1000).map((r) => paceSecPerKm(r.distanceM, r.durationMs)!)

  const importGpx = async (file: File) => {
    const parsed = parseGpx(await file.text())
    if (!parsed) {
      setImportMsg('File GPX không có đường chạy hợp lệ.')
      return
    }
    const distanceM = totalDistance(parsed.points)
    const durationMs = parsed.points[parsed.points.length - 1][2]
    const run: Run = {
      id: Math.random().toString(36).slice(2, 10) + parsed.startedAt.toString(36),
      title: parsed.name || defaultTitle(parsed.startedAt),
      startedAt: parsed.startedAt,
      durationMs,
      distanceM,
      steps: estimateSteps(distanceM, durationMs, body.heightCm),
      stepsEstimated: true,
      kcal: estimateKcal(distanceM, durationMs, body.weightKg),
      points: thinPoints(parsed.points),
      source: 'gpx',
    }
    setRuns((rs) => [run, ...rs].sort((a, b) => b.startedAt - a.startedAt))
    setImportMsg('')
    setOpenId(run.id)
  }

  return (
    <div className="stack">
      <header className="page-head">
        <h1 className="display">Chạy bộ</h1>
        <p className="muted">Ghi đường chạy bằng GPS, đo quãng đường, pace, bước chân và tạo ảnh story.</p>
      </header>

      {inFrame && (
        <section className="card frame-note">
          <b>GPS không chạy trong khung xem này</b>
          <p className="small muted">
            Trang đang mở bên trong một khung nhúng nên trình duyệt chặn Vị trí và cảm biến bước. Mở app trực tiếp bằng trình duyệt điện thoại để ghi buổi chạy thật. Ở đây vẫn xem lịch sử, nhập GPX và tạo ảnh story được.
          </p>
        </section>
      )}

      <section className="run-start">
        <button className="start-orb" onClick={() => void rec.start()}>
          <IconPlay size={30} />
          <span>Bắt đầu</span>
        </button>
        <p className="muted small center">Để màn hình sáng khi chạy. Trình duyệt sẽ hỏi quyền Vị trí và Chuyển động — chọn Cho phép.</p>
      </section>

      <div className="stats">
        <div className="stat">
          <b>{weekKm.toFixed(1)}</b>
          <span>km tuần này</span>
        </div>
        <div className="stat">
          <b>{week.length}</b>
          <span>buổi tuần này</span>
        </div>
        <div className="stat">
          <b>{best.length ? formatPace(Math.min(...best)) : '–'}</b>
          <span>pace tốt nhất</span>
        </div>
      </div>

      <section className="stack-sm">
        <div className="row between">
          <h2>Các buổi chạy</h2>
          <span className="muted small num">{totalKm.toFixed(1)} km tổng</span>
        </div>
        {runs.length === 0 && <p className="muted small">Chưa có buổi nào. Bấm Bắt đầu khi ra đường chạy, hoặc nhập file GPX từ Strava/Garmin.</p>}
        {runs.map((r) => (
          <button key={r.id} className="run-item" onClick={() => setOpenId(r.id)}>
            <RouteMap points={r.points} width={120} height={90} tiles={false} className="mini" />
            <span className="ri-main">
              <span className="ri-when small muted">{fmtWhen(r.startedAt)}</span>
              <b>{r.title}</b>
              <span className="ri-stats num">
                <span>
                  <b>{formatKm(r.distanceM)}</b> km
                </span>
                <span>{formatPace(paceSecPerKm(r.distanceM, r.durationMs))} /km</span>
                <span>{formatDuration(r.durationMs)}</span>
              </span>
            </span>
          </button>
        ))}
        <label className="btn ghost small left">
          Nhập file GPX
          <input id="gpx-file" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden onChange={(e) => e.target.files?.[0] && void importGpx(e.target.files[0])} />
        </label>
        {importMsg && <p className="small warn-text">{importMsg}</p>}
      </section>
    </div>
  )
}

function GpsPill({ gps }: { gps: GpsState }) {
  const map = {
    waiting: ['wait', 'Đang tìm GPS…'],
    ok: ['ok', 'GPS tốt'],
    weak: ['weak', 'GPS yếu'],
    error: ['err', 'Lỗi GPS'],
  } as const
  const [cls, label] = map[gps.kind]
  return (
    <span className={`gps-pill ${cls}`}>
      <i /> {label}
      {(gps.kind === 'ok' || gps.kind === 'weak') && <span className="num"> ±{Math.round(gps.accuracy)}m</span>}
    </span>
  )
}

function Recording({ rec, body, onSaved }: { rec: ReturnType<typeof useRunRecorder>; body: { weightKg: number; heightCm: number }; onSaved: (r: Run) => void }) {
  const d = rec.draft!
  const elapsed = elapsedOf(d)
  const dist = totalDistance(d.points)
  const avg = paceSecPerKm(dist, elapsed)
  const now = currentPace(d.points)
  const steps = d.motion && d.steps > 0 ? d.steps : estimateSteps(dist, elapsed, body.heightCm)
  const paused = d.status === 'paused'

  return (
    <div className="stack run-live">
      <div className="row between">
        <span className={`live-tag ${paused ? 'paused' : ''}`}>{paused ? 'Tạm dừng' : '● Đang ghi'}</span>
        <GpsPill gps={rec.gps} />
      </div>
      {rec.gps.kind === 'error' && <p className="small warn-text">{rec.gps.message}</p>}

      <div className="big-dist">
        <span className="num">{formatKm(dist)}</span>
        <small>km</small>
      </div>

      <div className="live-grid">
        <div>
          <span className="eyebrow">Thời gian</span>
          <b className="num">{formatDuration(elapsed)}</b>
        </div>
        <div>
          <span className="eyebrow">Pace hiện tại</span>
          <b className="num">{formatPace(now)}</b>
        </div>
        <div>
          <span className="eyebrow">Pace TB</span>
          <b className="num">{formatPace(avg)}</b>
        </div>
        <div>
          <span className="eyebrow">Bước{d.motion ? '' : ' (ước tính)'}</span>
          <b className="num">{steps.toLocaleString('vi-VN')}</b>
        </div>
      </div>

      <RouteMap points={d.points} width={360} height={240} live />

      <div className="run-controls">
        {paused ? (
          <>
            <button className="ctrl resume" onClick={rec.resume}>
              Tiếp tục
            </button>
            <button
              className="ctrl finish"
              onClick={() => {
                const run = rec.finish(body)
                if (run) onSaved(run)
              }}
            >
              Kết thúc
            </button>
          </>
        ) : (
          <button className="ctrl pause" onClick={rec.pause}>
            Tạm dừng
          </button>
        )}
      </div>
      {paused && (
        <ConfirmButton className="btn ghost small" confirmLabel="Bấm lần nữa để bỏ buổi này" onConfirm={rec.discard}>
          Bỏ, không lưu
        </ConfirmButton>
      )}
    </div>
  )
}

function RunDetail({ run, onBack, onRename, onDelete }: { run: Run; onBack: () => void; onRename: (t: string) => void; onDelete: () => void }) {
  const sp = useMemo(() => splits(run.points), [run.points])
  const pace = paceSecPerKm(run.distanceM, run.durationMs)
  const [preview, setPreview] = useState<{ variant: StoryVariant; url: string; blob: Blob } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const maxSplit = Math.max(...sp, 1)

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url)
    },
    [preview],
  )

  const makeStory = async (variant: StoryVariant) => {
    setBusy(true)
    setMsg('')
    try {
      const blob = await renderStory(run, variant)
      setPreview({ variant, blob, url: URL.createObjectURL(blob) })
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    if (!preview) return
    const name = `chay-${toISODate(new Date(run.startedAt))}-${preview.variant}.png`
    const res = await shareOrSave(preview.blob, name)
    setMsg(
      res === 'shared'
        ? 'Đã mở chia sẻ.'
        : res === 'saved'
          ? 'Đã lưu ảnh. Mở Instagram → Story → chọn ảnh vừa lưu.'
          : res === 'cancelled'
            ? ''
            : 'Không lưu được ở đây. Nhấn giữ ảnh xem trước để lưu.',
    )
  }

  return (
    <div className="stack">
      <div className="row between">
        <button className="btn ghost small" onClick={onBack}>
          ‹ Danh sách
        </button>
        <span className="muted small">{fmtWhen(run.startedAt)}</span>
      </div>
      <input id="run-title" className="title-input" value={run.title} onChange={(e) => onRename(e.target.value)} aria-label="Tên buổi chạy" />

      <RouteMap points={run.points} width={360} height={300} className="detail" />

      <div className="detail-grid">
        <div>
          <span className="eyebrow">Quãng đường</span>
          <b className="num">
            {formatKm(run.distanceM)} <small>km</small>
          </b>
        </div>
        <div>
          <span className="eyebrow">Pace</span>
          <b className="num">
            {formatPace(pace)} <small>/km</small>
          </b>
        </div>
        <div>
          <span className="eyebrow">Thời gian</span>
          <b className="num">{formatDuration(run.durationMs)}</b>
        </div>
        <div>
          <span className="eyebrow">Bước{run.stepsEstimated ? ' (ước tính)' : ''}</span>
          <b className="num">{run.steps.toLocaleString('vi-VN')}</b>
        </div>
        <div>
          <span className="eyebrow">Calo</span>
          <b className="num">
            {run.kcal} <small>kcal</small>
          </b>
        </div>
        <div>
          <span className="eyebrow">Nhịp bước</span>
          <b className="num">
            {run.durationMs > 0 ? Math.round(run.steps / (run.durationMs / 60000)) : 0} <small>bước/ph</small>
          </b>
        </div>
      </div>

      {sp.length > 0 && (
        <section className="card">
          <h2>Từng km</h2>
          <ul className="splits">
            {sp.map((ms, i) => (
              <li key={i}>
                <span className="num">{i + 1}</span>
                <div className="sbar">
                  <div style={{ width: `${(ms / maxSplit) * 100}%` }} />
                </div>
                <span className="num">{formatPace(ms / 1000)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Ảnh story</h2>
        <p className="muted small">Ảnh dọc 1080×1920 để đăng story. Bản "Trong suốt" dùng để dán đè lên ảnh hoặc video của bạn.</p>
        <div className="seg">
          <button className={preview?.variant === 'dark' ? 'on' : ''} disabled={busy} onClick={() => void makeStory('dark')}>
            Nền tối
          </button>
          <button className={preview?.variant === 'sticker' ? 'on' : ''} disabled={busy} onClick={() => void makeStory('sticker')}>
            Trong suốt
          </button>
        </div>
        {preview && (
          <>
            <div className={`story-preview ${preview.variant}`}>
              <img src={preview.url} alt="Xem trước ảnh story" />
            </div>
            <button className="btn-start" onClick={() => void share()}>
              Chia sẻ / Lưu ảnh
            </button>
          </>
        )}
        {msg && <p className="small">{msg}</p>}
      </section>

      <ConfirmButton className="btn danger small left" confirmLabel="Bấm lần nữa để xoá" onConfirm={onDelete}>
        Xoá buổi chạy
      </ConfirmButton>
    </div>
  )
}
