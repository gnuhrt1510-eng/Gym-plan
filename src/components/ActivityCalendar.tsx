import { useMemo, useState } from 'react'
import { addDays, startOfWeek, toISODate, today } from '../lib/date'
import { formatKm, type Run } from '../lib/run'
import type { SessionLog } from '../types'

const WEEKS = 20
const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTHS = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12']

interface DayInfo {
  sessions: SessionLog[]
  runs: Run[]
  sets: number
  km: number
  /** tổng phút tập (gym + chạy) */
  minutes: number
}

/** Mức đậm của ô theo tổng thời gian tập trong ngày: 0 nghỉ · 1 dưới 1 tiếng · 2 từ 1 tiếng · 3 từ 1 tiếng rưỡi */
export function dayLevel(d: DayInfo | undefined): 0 | 1 | 2 | 3 {
  if (!d || (d.sessions.length === 0 && d.runs.length === 0)) return 0
  if (d.minutes >= 90) return 3
  if (d.minutes >= 60) return 2
  return 1
}

/** Thời lượng một buổi gym (phút); thiếu giờ bắt đầu/kết thúc thì ước tính ~3 phút/set */
export function sessionMinutes(l: SessionLog, doneSets: number): number {
  const m = (l.finishedAt - l.startedAt) / 60000
  return m > 0 && m < 6 * 60 ? m : doneSets * 3
}

export function formatMinutes(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} phút`
  return `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`
}

export function buildDays(logs: SessionLog[], runs: Run[]): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>()
  const get = (date: string) => {
    let d = map.get(date)
    if (!d) map.set(date, (d = { sessions: [], runs: [], sets: 0, km: 0, minutes: 0 }))
    return d
  }
  for (const l of logs) {
    const sets = l.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
    if (sets === 0) continue
    const d = get(l.date)
    d.sessions.push(l)
    d.sets += sets
    d.minutes += sessionMinutes(l, sets)
  }
  for (const r of runs) {
    const d = get(toISODate(new Date(r.startedAt)))
    d.runs.push(r)
    d.km += r.distanceM / 1000
    d.minutes += r.durationMs / 60000
  }
  return map
}

/** Số tuần liên tiếp (tính đến tuần trước, cộng tuần này nếu đã đạt) đạt mục tiêu số buổi */
export function weekStreak(days: Map<string, DayInfo>, target: number, now = today()): number {
  const count = (weekStart: string) => {
    let n = 0
    for (let i = 0; i < 7; i++) if (dayLevel(days.get(addDays(weekStart, i))) > 0) n++
    return n
  }
  let ws = startOfWeek(now)
  let streak = count(ws) >= target ? 1 : 0
  for (;;) {
    ws = addDays(ws, -7)
    if (count(ws) >= target) streak++
    else break
  }
  return streak
}

export default function ActivityCalendar({ logs, runs, target }: { logs: SessionLog[]; runs: Run[]; target: number }) {
  const days = useMemo(() => buildDays(logs, runs), [logs, runs])
  const now = today()
  const thisWeek = startOfWeek(now)
  const gridStart = addDays(thisWeek, -(WEEKS - 1) * 7)

  const [month, setMonth] = useState(() => now.slice(0, 7))
  const [picked, setPicked] = useState<string | null>(null)

  const weekCount = DOW.reduce((n, _, i) => n + (dayLevel(days.get(addDays(thisWeek, i))) > 0 ? 1 : 0), 0)
  const streak = weekStreak(days, Math.max(1, target), now)
  const monthDays = [...days.keys()].filter((d) => d.startsWith(month) && dayLevel(days.get(d)) > 0).length

  // nhãn tháng phía trên cột đầu tiên của mỗi tháng
  const monthLabels: { col: number; label: string }[] = []
  for (let w = 0; w < WEEKS; w++) {
    const d = addDays(gridStart, w * 7)
    const m = Number(d.slice(5, 7)) - 1
    const prev = w === 0 ? -1 : Number(addDays(gridStart, (w - 1) * 7).slice(5, 7)) - 1
    if (m !== prev && (w > 0 || Number(d.slice(8)) <= 7)) monthLabels.push({ col: w, label: MONTHS[m] })
  }

  // lịch tháng
  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const calStart = startOfWeek(first)
  const daysInMonth = new Date(y, m, 0).getDate()
  const lastDay = `${month}-${String(daysInMonth).padStart(2, '0')}`
  const cells: string[] = []
  for (let d = calStart; d <= lastDay || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d)
  const shiftMonth = (delta: number) => {
    const dt = new Date(y, m - 1 + delta, 1)
    setMonth(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`)
    setPicked(null)
  }
  const info = picked ? days.get(picked) : undefined

  return (
    <section className="card activity">
      <div className="row between">
        <div>
          <h2>Lịch tập</h2>
          <p className="muted small">Ngày có tập gym hoặc chạy bộ</p>
        </div>
      </div>

      <div className="heat-wrap">
        <div className="heat-months" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
          {monthLabels.map((ml) => (
            <span key={ml.col} style={{ gridColumn: `${ml.col + 1} / span 3` }}>
              {ml.label}
            </span>
          ))}
        </div>
        <div className="heat" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }} role="img" aria-label={`Bảng ${WEEKS} tuần gần nhất`}>
          {Array.from({ length: WEEKS * 7 }, (_, i) => {
            const w = Math.floor(i / 7)
            const dIdx = i % 7
            const date = addDays(gridStart, w * 7 + dIdx)
            const future = date > now
            const lv = dayLevel(days.get(date))
            return (
              <button
                key={date}
                className={`hc l${lv} ${future ? 'future' : ''} ${date === now ? 'today' : ''} ${date === picked ? 'picked' : ''}`}
                style={{ gridColumn: w + 1, gridRow: dIdx + 1 }}
                disabled={future}
                title={date}
                aria-label={`${date}${lv ? ': có tập' : ': nghỉ'}`}
                onClick={() => {
                  setPicked(date)
                  setMonth(date.slice(0, 7))
                }}
              />
            )
          })}
        </div>
      </div>

      <div className="chips">
        <span className="chip-stat">
          <b className="num">
            {weekCount}/{target}
          </b>{' '}
          buổi tuần này
        </span>
        <span className="chip-stat">
          🔥 <b className="num">{streak}</b> tuần liên tiếp đạt
        </span>
        <span className="chip-stat">
          <b className="num">{monthDays}</b> ngày tập trong {MONTHS[m - 1].replace('Th', 'tháng ')}
        </span>
      </div>

      <div className="cal">
        <div className="cal-head">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((d) => {
            const inMonth = d.startsWith(month)
            const di = days.get(d)
            const lv = dayLevel(di)
            return (
              <button
                key={d}
                className={`cd ${inMonth ? '' : 'out'} ${lv ? 'active' : ''} ${d === now ? 'today' : ''} ${d === picked ? 'picked' : ''}`}
                onClick={() => setPicked(d)}
                aria-label={`Ngày ${Number(d.slice(8))}${lv ? ', có tập' : ''}`}
              >
                <span className="num">{Number(d.slice(8))}</span>
                <span className="cd-dots">
                  {di && di.sessions.length > 0 && <i className="g" />}
                  {di && di.runs.length > 0 && <i className="r" />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="cal-nav">
          <span className="cal-month">
            {MONTHS[m - 1].replace('Th', 'Tháng ')} {y}
          </span>
          <div className="row gap">
            <button className="btn round small-round" onClick={() => shiftMonth(-1)} aria-label="Tháng trước">
              ‹
            </button>
            <button className="btn round small-round" onClick={() => shiftMonth(1)} aria-label="Tháng sau" disabled={month >= now.slice(0, 7)}>
              ›
            </button>
          </div>
        </div>
      </div>

      {picked && (
        <div className="day-detail">
          <b>
            {Number(picked.slice(8))}/{Number(picked.slice(5, 7))}/{picked.slice(0, 4)}
            {info && dayLevel(info) > 0 && <span className="muted"> · tổng {formatMinutes(info.minutes)}</span>}
          </b>
          {!info || dayLevel(info) === 0 ? (
            <span className="muted small">Ngày nghỉ</span>
          ) : (
            <ul>
              {info.sessions.map((s) => (
                <li key={s.id}>
                  <i className="g" /> {s.dayName} · {s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)} set ·{' '}
                  {formatMinutes(sessionMinutes(s, s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)))}
                </li>
              ))}
              {info.runs.map((r) => (
                <li key={r.id}>
                  <i className="r" /> {r.title} · {formatKm(r.distanceM)} km · {formatMinutes(r.durationMs / 60000)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="legend-row small muted">
        <span>
          <i className="g" /> Gym
        </span>
        <span>
          <i className="r" /> Chạy
        </span>
        <span className="heat-scale">
          <i className="hc l1" /> &lt;1h <i className="hc l2" /> 1h <i className="hc l3" /> 1h30+
        </span>
      </div>
    </section>
  )
}
