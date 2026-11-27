import { EXERCISE_MAP, PROGRAMS, PROGRAM_MAP } from '../data/programs'
import { addDays, startOfWeek, today } from '../lib/date'
import { currentWeight, formatWeight } from '../lib/progression'
import type { Update } from '../lib/store'
import type { AppState, Program, ProgramDay } from '../types'

const WEEKDAY = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const GROUP_ORDER = ['Ngực', 'Lưng', 'Vai', 'Tay trước', 'Tay sau', 'Cẳng tay', 'Đùi trước', 'Đùi sau', 'Mông', 'Bắp chuối', 'Bụng']

/** Gán buổi tập lần lượt vào các thứ đã chọn: thứ đầu tiên = buổi 1, … */
export function weekSchedule(program: Program, trainingDays: number[]): (ProgramDay | null)[] {
  const days = [...trainingDays].sort((a, b) => a - b)
  return WEEKDAY.map((_, i) => {
    const idx = days.indexOf(i)
    return idx === -1 ? null : program.days[idx % program.days.length]
  })
}

export function setsPerGroup(schedule: (ProgramDay | null)[]): { group: string; sets: number }[] {
  const totals = new Map<string, number>()
  for (const day of schedule) {
    if (!day) continue
    for (const pe of day.exercises) {
      const g = EXERCISE_MAP[pe.exerciseId].group
      totals.set(g, (totals.get(g) ?? 0) + pe.sets)
    }
  }
  return GROUP_ORDER.filter((g) => totals.has(g)).map((g) => ({ group: g, sets: totals.get(g)! }))
}

const fmtRest = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}p${sec % 60 ? sec % 60 : ''}` : `${sec}s`)

export default function PlanOverview({ state, update }: { state: AppState; update: Update }) {
  const program = PROGRAM_MAP[state.programId]
  const schedule = weekSchedule(program, state.trainingDays)
  const volume = setsPerGroup(schedule)
  const maxSets = Math.max(20, ...volume.map((v) => v.sets))
  const weekStart = startOfWeek(today())
  const todayIdx = (new Date().getDay() + 6) % 7
  const chosen = state.trainingDays.length

  const toggleDay = (i: number) =>
    update((s) => {
      const has = s.trainingDays.includes(i)
      if (has && s.trainingDays.length === 1) return s
      return { ...s, trainingDays: has ? s.trainingDays.filter((d) => d !== i) : [...s.trainingDays, i].sort((a, b) => a - b) }
    })

  return (
    <div className="stack">
      <section className="card">
        <label className="field">
          <span className="eyebrow">Chương trình đang dùng</span>
          <select id="program-select" value={state.programId} onChange={(e) => update((s) => ({ ...s, programId: e.target.value }))}>
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.days.length} buổi)
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">{program.description}</p>
      </section>

      <section className="card">
        <h2>Lịch tuần</h2>
        <p className="muted small">Chọn các ngày đi tập. Buổi 1 rơi vào ngày đầu tiên, buổi 2 vào ngày tiếp theo…</p>
        <div className="day-picker">
          {WEEKDAY_SHORT.map((d, i) => (
            <button key={d} className={state.trainingDays.includes(i) ? 'on' : ''} onClick={() => toggleDay(i)} aria-pressed={state.trainingDays.includes(i)}>
              {d}
            </button>
          ))}
        </div>
        {chosen !== program.days.length && (
          <p className="small warn-text">
            Đang chọn {chosen} ngày, chương trình có {program.days.length} buổi
            {chosen < program.days.length ? ' — sẽ có buổi không được xếp lịch.' : ' — các buổi sẽ lặp lại.'}
          </p>
        )}
        <ul className="schedule">
          {schedule.map((day, i) => {
            const date = addDays(weekStart, i)
            const done = state.logs.some((l) => l.date === date)
            return (
              <li key={i} className={`${i === todayIdx ? 'today' : ''} ${day ? '' : 'rest'}`}>
                <span className="sched-day">{WEEKDAY[i]}</span>
                <span className="sched-name">
                  {day ? (
                    <>
                      <b>{day.name}</b>
                      <span className="muted small">{day.focus}</span>
                    </>
                  ) : (
                    <span className="muted">Nghỉ</span>
                  )}
                </span>
                <span className={`check small-check ${done ? 'on' : ''}`}>{done ? '✓' : ''}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {program.days.map((day) => {
        const totalSets = day.exercises.reduce((n, e) => n + e.sets, 0)
        const minutes = Math.round(day.exercises.reduce((t, e) => t + e.sets * (45 + e.restSec), 0) / 60)
        return (
          <section key={day.id} className="card">
            <div className="row between">
              <div>
                <h2>{day.name}</h2>
                <p className="muted small">{day.focus}</p>
              </div>
              <span className="pill num">
                {totalSets} set · ~{minutes}p
              </span>
            </div>
            <div className="table-wrap">
              <table className="table plan-table">
                <thead>
                  <tr>
                    <th>Bài</th>
                    <th>Set × rep</th>
                    <th>Nghỉ</th>
                    <th>Tạ</th>
                  </tr>
                </thead>
                <tbody>
                  {day.exercises.map((pe) => {
                    const ex = EXERCISE_MAP[pe.exerciseId]
                    return (
                      <tr key={pe.exerciseId}>
                        <td>
                          {ex.name}
                          <div className="muted small">{ex.muscle}</div>
                        </td>
                        <td className="num">
                          {pe.sets} × {pe.repsMin}-{pe.repsMax}
                        </td>
                        <td className="num">{fmtRest(pe.restSec)}</td>
                        <td className="num">{formatWeight(ex, currentWeight(ex, state.progress))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      <section className="card">
        <h2>Số set mỗi tuần theo nhóm cơ</h2>
        <p className="muted small">Tính theo lịch tuần ở trên. Nhóm cơ lớn thường cần khoảng 10–20 set/tuần (vạch mờ là mốc 10).</p>
        <ul className="volume">
          {volume.map((v) => (
            <li key={v.group}>
              <span>{v.group}</span>
              <div className="vbar">
                <div style={{ width: `${(v.sets / maxSets) * 100}%` }} />
                <i style={{ left: `${(10 / maxSets) * 100}%` }} />
              </div>
              <span className="num">{v.sets}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
