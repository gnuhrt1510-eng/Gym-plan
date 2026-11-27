import { useEffect, useState } from 'react'
import { EXERCISE_MAP, PROGRAM_MAP } from '../data/programs'
import { addDays, startOfWeek, today } from '../lib/date'
import { currentWeight, formatWeight, newExerciseLog, nextProgress } from '../lib/progression'
import { uid, type Update } from '../lib/store'
import type { AppState, Draft, ExerciseLog, Outcome, ProgramDay, ProgressChange, SessionLog } from '../types'
import ConfirmButton from './ConfirmButton'
import { IconArrowUp, IconCheck, IconChevron, IconClock, IconLayers, IconPlay } from './Icons'
import Ring from './Ring'
import MuscleMap from './MuscleMap'
import { EXERCISE_MUSCLES, GROUP_MUSCLES } from '../data/muscles'
import PlanOverview, { setsPerGroup, weekSchedule } from './PlanOverview'

const OUTCOME_TEXT: Record<Outcome, string> = {
  up: 'Tăng tạ',
  hold: 'Giữ tạ, cố thêm rep',
  stall: 'Chưa đạt, thử lại',
  deload: 'Giảm 10% để hồi phục',
}

const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const DOW_LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật']

export function dayMinutes(day: ProgramDay): number {
  return Math.round(day.exercises.reduce((t, e) => t + e.sets * (45 + e.restSec), 0) / 60)
}

interface Props {
  state: AppState
  update: Update
}

export default function WorkoutTab({ state, update }: Props) {
  const program = PROGRAM_MAP[state.programId]
  const [summary, setSummary] = useState<SessionLog | null>(null)
  const [view, setView] = useState<'today' | 'overview'>('today')
  const [selected, setSelected] = useState(today())
  const [pickedDayId, setPickedDayId] = useState<string | null>(null)

  if (state.draft) {
    return <ActiveSession draft={state.draft} progress={state.progress} update={update} onFinish={(log) => setSummary(log)} />
  }

  const weekStart = startOfWeek(today())
  const schedule = weekSchedule(program, state.trainingDays)
  const selIdx = DOW.findIndex((_, i) => addDays(weekStart, i) === selected)
  const scheduled = selIdx >= 0 ? schedule[selIdx] : null
  const day = (pickedDayId && program.days.find((d) => d.id === pickedDayId)) || scheduled
  const loggedOnSelected = state.logs.filter((l) => l.date === selected)

  // Lần thay đổi gần nhất của mỗi bài → hiện badge ↑
  const lastChange: Record<string, ProgressChange> = {}
  for (const l of state.logs) for (const c of l.changes) lastChange[c.exerciseId] = c

  // Set đã hoàn thành trong tuần theo nhóm cơ
  const doneByGroup = new Map<string, number>()
  for (const l of state.logs.filter((x) => x.date >= weekStart))
    for (const e of l.exercises) {
      const g = EXERCISE_MAP[e.exerciseId].group
      doneByGroup.set(g, (doneByGroup.get(g) ?? 0) + e.sets.filter((s) => s.done).length)
    }
  const plannedByGroup = new Map(setsPerGroup(schedule).map((v) => [v.group, v.sets]))

  const start = (d: ProgramDay) => {
    window.scrollTo(0, 0)
    update((s) => ({
      ...s,
      draft: {
        programId: program.id,
        dayId: d.id,
        startedAt: Date.now(),
        exercises: d.exercises.map((pe) => newExerciseLog(pe, currentWeight(EXERCISE_MAP[pe.exerciseId], s.progress))),
      },
    }))
  }

  const groups = day ? [...new Set(day.exercises.map((pe) => EXERCISE_MAP[pe.exerciseId].group))] : []
  const totalSets = day ? day.exercises.reduce((n, e) => n + e.sets, 0) : 0
  const isToday = selected === today()

  return (
    <div className="stack">
      <header className="page-head">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={view === 'today'} className={view === 'today' ? 'on' : ''} onClick={() => setView('today')}>
            Lịch tập
          </button>
          <button role="tab" aria-selected={view === 'overview'} className={view === 'overview' ? 'on' : ''} onClick={() => setView('overview')}>
            Tổng quan plan
          </button>
        </div>
      </header>

      {summary && <SummaryCard log={summary} onClose={() => setSummary(null)} />}

      {view === 'overview' ? (
        <PlanOverview state={state} update={update} />
      ) : (
        <>
          <div className="week-strip">
            {DOW.map((d, i) => {
              const date = addDays(weekStart, i)
              const done = state.logs.some((l) => l.date === date)
              const train = !!schedule[i]
              return (
                <button
                  key={d}
                  className={`ws-day ${date === selected ? 'sel' : ''} ${date === today() ? 'is-today' : ''} ${train ? 'train' : ''}`}
                  onClick={() => {
                    setSelected(date)
                    setPickedDayId(null)
                  }}
                  aria-label={`${DOW_LONG[i]} ${date.slice(8)}`}
                >
                  <span className="ws-dow">{d}</span>
                  <span className="ws-num num">{Number(date.slice(8))}</span>
                  <span className={`ws-dot ${done ? 'done' : train ? 'plan' : ''}`} />
                </button>
              )
            })}
          </div>

          <section className="hero">
            <div className="hero-head">
              <div>
                <p className="eyebrow">{isToday ? 'Hôm nay' : DOW_LONG[selIdx] ?? ''}</p>
                <h1 className="display">{day ? day.name.replace(/^Buổi \d+: /, '') : 'Ngày nghỉ'}</h1>
                {day ? (
                  <p className="hero-meta">
                    <span>{day.name.match(/^Buổi \d+/)?.[0] ?? program.name}</span>
                    <span className="meta-i">
                      <IconClock size={15} /> ~{dayMinutes(day)} phút
                    </span>
                    <span className="meta-i">
                      <IconLayers size={15} /> {totalSets} set
                    </span>
                  </p>
                ) : (
                  <p className="hero-meta">Cơ bắp lớn lên khi nghỉ. Muốn tập bù thì chọn buổi bên dưới.</p>
                )}
              </div>
              {loggedOnSelected.length > 0 && (
                <span className="done-badge">
                  <IconCheck size={14} /> Đã tập
                </span>
              )}
            </div>

            {day && (
              <>
                <div className="muscle-row">
                  {groups.map((g) => {
                    const planned = plannedByGroup.get(g) ?? 0
                    const done = doneByGroup.get(g) ?? 0
                    const dots = Math.max(planned, 1)
                    return (
                      <div key={g} className="muscle-card">
                        <MuscleMap muscles={GROUP_MUSCLES[g] ?? []} zoom aspect={1.45} fill />
                        <span className="mc-name">{g}</span>
                        <span className="mc-count num">
                          <b>{done}</b>/{planned} set tuần này
                        </span>
                        <span className="mc-dots" aria-hidden="true">
                          {Array.from({ length: Math.min(dots, 20) }, (_, k) => (
                            <i key={k} className={k < done ? 'on' : ''} />
                          ))}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <ul className="ex-pills">
                  {day.exercises.map((pe) => {
                    const ex = EXERCISE_MAP[pe.exerciseId]
                    const ch = lastChange[pe.exerciseId]
                    return (
                      <li key={pe.exerciseId}>
                        <span className="exp-thumb">
                          <MuscleMap targets={EXERCISE_MUSCLES[pe.exerciseId]} size={70} zoom aspect={1} />
                        </span>
                        <div className="exp-main">
                          <span className="exp-name">{ex.name}</span>
                          <span className="exp-sub num">
                            {pe.sets} × {pe.repsMin}-{pe.repsMax} · {formatWeight(ex, currentWeight(ex, state.progress))}
                          </span>
                        </div>
                        {ch?.outcome === 'up' && (
                          <span className="up-badge num">
                            <IconArrowUp size={13} /> {+(ch.to - ch.from).toFixed(2)} kg
                          </span>
                        )}
                        <span className="exp-sets num">{pe.sets} set</span>
                      </li>
                    )
                  })}
                </ul>

                <button className="btn-start" onClick={() => start(day)}>
                  <IconPlay size={18} /> Bắt đầu tập
                </button>
              </>
            )}
          </section>

          <section className="other-days">
            <p className="eyebrow">{day ? 'Đổi sang buổi khác' : 'Tập bù buổi'}</p>
            <div className="chip-scroll">
              {program.days.map((d) => (
                <button key={d.id} className={`day-chip ${day?.id === d.id ? 'on' : ''}`} onClick={() => setPickedDayId(d.id)}>
                  <b>{d.name.replace(/^Buổi \d+: /, '')}</b>
                  <span>{d.name.match(/^Buổi \d+/)?.[0] ?? `${d.exercises.length} bài`}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function SummaryCard({ log, onClose }: { log: SessionLog; onClose: () => void }) {
  const ups = log.changes.filter((c) => c.outcome === 'up').length
  return (
    <section className="card summary">
      <div className="row between">
        <div>
          <p className="eyebrow">Hoàn thành</p>
          <h2 className="display-sm">{log.dayName}</h2>
        </div>
        <button className="btn ghost small" onClick={onClose}>
          Đóng
        </button>
      </div>
      <p className="muted small">{ups > 0 ? `${ups} bài sẽ tăng tạ ở buổi sau.` : 'Buổi sau giữ mức tạ, cố thêm rep.'}</p>
      <ul className="ex-list">
        {log.changes.map((c) => (
          <li key={c.exerciseId}>
            <span>{EXERCISE_MAP[c.exerciseId].name}</span>
            <span className={`outcome ${c.outcome}`}>
              <b className="num">{formatWeight(EXERCISE_MAP[c.exerciseId], c.to)}</b>
              <span className="small"> · {OUTCOME_TEXT[c.outcome]}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function useRestTimer() {
  const [endAt, setEndAt] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!endAt) return
    const t = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= endAt) {
        setEndAt(null)
        navigator.vibrate?.([200, 100, 200])
      }
    }, 250)
    return () => clearInterval(t)
  }, [endAt])
  const remaining = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0
  return {
    remaining,
    total,
    start: (sec: number) => {
      setNow(Date.now())
      setTotal(sec)
      setEndAt(Date.now() + sec * 1000)
    },
    add: (sec: number) => {
      setTotal((t) => t + sec)
      setEndAt((e) => (e ? e + sec * 1000 : e))
    },
    stop: () => setEndAt(null),
  }
}


function ActiveSession({
  draft,
  progress,
  update,
  onFinish,
}: {
  draft: Draft
  progress: AppState['progress']
  update: Update
  onFinish: (log: SessionLog) => void
}) {
  const program = PROGRAM_MAP[draft.programId]
  const day = program.days.find((d) => d.id === draft.dayId)!
  const timer = useRestTimer()
  const firstOpen = draft.exercises.findIndex((e) => !e.sets.every((s) => s.done))
  const [open, setOpen] = useState<number>(firstOpen === -1 ? 0 : firstOpen)

  const totalSets = draft.exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const elapsed = Math.floor((Date.now() - draft.startedAt) / 60000)

  const editExercise = (i: number, fn: (e: ExerciseLog) => ExerciseLog) =>
    update((s) => (s.draft ? { ...s, draft: { ...s.draft, exercises: s.draft.exercises.map((e, j) => (j === i ? fn(e) : e)) } } : s))

  const toggleSet = (i: number, k: number) => {
    const ex = draft.exercises[i]
    const willBeDone = !ex.sets[k].done
    editExercise(i, (e) => ({ ...e, sets: e.sets.map((st, j) => (j === k ? { ...st, done: willBeDone } : st)) }))
    if (willBeDone) {
      timer.start(ex.restSec)
      const allDoneNow = ex.sets.every((s, j) => (j === k ? true : s.done))
      if (allDoneNow) {
        const next = draft.exercises.findIndex((e, j) => j !== i && !e.sets.every((s) => s.done))
        if (next !== -1) setOpen(next)
      }
    }
  }

  const finish = () => {
    const nextState = { ...progress }
    const changes = draft.exercises.map((e) => {
      const { state: next, outcome } = nextProgress(e, EXERCISE_MAP[e.exerciseId], nextState[e.exerciseId])
      nextState[e.exerciseId] = next
      return { exerciseId: e.exerciseId, from: e.weight, to: next.weight, outcome }
    })
    const log: SessionLog = {
      id: uid(),
      date: today(),
      programId: draft.programId,
      dayId: draft.dayId,
      dayName: day.name,
      startedAt: draft.startedAt,
      finishedAt: Date.now(),
      exercises: draft.exercises,
      changes,
    }
    update((s) => ({ ...s, progress: { ...s.progress, ...nextState }, logs: [...s.logs, log], draft: null }))
    timer.stop()
    onFinish(log)
  }

  const cancel = () => update((s) => ({ ...s, draft: null }))
  const pct = totalSets ? doneSets / totalSets : 0
  const mm = Math.floor(timer.remaining / 60)
  const ss = String(timer.remaining % 60).padStart(2, '0')

  return (
    <div className="stack">
      <header className="session-head">
        <div>
          <p className="eyebrow">Đang tập · {elapsed} phút</p>
          <h1 className="display">{day.name.replace(/^Buổi \d+: /, '')}</h1>
        </div>
        <Ring value={pct} size={64} stroke={6}>
          <span className="num ring-small">
            {doneSets}/{totalSets}
          </span>
        </Ring>
      </header>

      {timer.remaining > 0 && (
        <div className="rest-card" role="timer" aria-live="polite">
          <Ring value={timer.total ? timer.remaining / timer.total : 0} size={84} stroke={7}>
            <span className="num rest-time">
              {mm}:{ss}
            </span>
          </Ring>
          <div className="rest-info">
            <b>Nghỉ giữa set</b>
            <div className="row gap">
              <button className="btn small" onClick={() => timer.add(15)}>
                +15s
              </button>
              <button className="btn small ghost" onClick={timer.stop}>
                Bỏ qua
              </button>
            </div>
          </div>
        </div>
      )}

      {draft.exercises.map((e, i) => {
        const def = EXERCISE_MAP[e.exerciseId]
        const done = e.sets.filter((s) => s.done).length
        const allDone = done === e.sets.length
        if (open !== i) {
          return (
            <button key={e.exerciseId + i} className={`ex-collapsed ${allDone ? 'complete' : ''}`} onClick={() => setOpen(i)}>
              <span className={`exc-check ${allDone ? 'on' : ''}`}>{allDone && <IconCheck size={14} />}</span>
              <span className="exc-thumb">
                <MuscleMap targets={EXERCISE_MUSCLES[e.exerciseId]} size={46} zoom aspect={1} />
              </span>
              <span className="exc-name">{def.name}</span>
              <span className="exc-meta num">
                {done}/{e.sets.length} · {formatWeight(def, e.weight)}
              </span>
              <IconChevron size={16} />
            </button>
          )
        }
        return (
          <section key={e.exerciseId + i} className="card ex-open">
            <div className="ex-open-head">
              <div className="ex-open-text">
                <p className="eyebrow">
                  Bài {i + 1}/{draft.exercises.length}
                </p>
                <h2 className="display-sm">{def.name}</h2>
                <p className="muted small">
                  {def.nameEn} · mục tiêu {e.repsMin}-{e.repsMax} rep
                </p>
              </div>
              {EXERCISE_MUSCLES[e.exerciseId] && <MuscleMap targets={EXERCISE_MUSCLES[e.exerciseId]} views="both" size={230} labels />}
            </div>
            {EXERCISE_MUSCLES[e.exerciseId] && <MuscleMap targets={EXERCISE_MUSCLES[e.exerciseId]} figures={false} legend />}
            <div className="weight-ctrl">
              <button className="btn round" aria-label="Giảm tạ" onClick={() => editExercise(i, (x) => ({ ...x, weight: Math.max(0, x.weight - def.increment) }))}>
                −
              </button>
              <label className="weight-field">
                <input
                  id={`weight-${i}`}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={e.weight}
                  onChange={(ev) => editExercise(i, (x) => ({ ...x, weight: Number(ev.target.value) || 0 }))}
                />
                <span>{def.bodyweight ? 'kg đeo thêm' : 'kg'}</span>
              </label>
              <button className="btn round" aria-label="Tăng tạ" onClick={() => editExercise(i, (x) => ({ ...x, weight: x.weight + def.increment }))}>
                +
              </button>
            </div>
            <div className="set-list">
              <div className="set-list-head small muted">
                <span>Set checklist</span>
                <span className="num">
                  {done} / {e.sets.length}
                </span>
              </div>
              {e.sets.map((st, k) => (
                <div key={k} className={`set-row ${st.done ? 'done' : ''}`}>
                  <button className={`checkbox ${st.done ? 'on' : ''}`} onClick={() => toggleSet(i, k)} aria-label={`Hoàn thành set ${k + 1}`}>
                    {st.done && <IconCheck size={18} />}
                  </button>
                  <span className="set-no">Set {k + 1}</span>
                  <label className="reps">
                    <input
                      id={`reps-${i}-${k}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={st.reps}
                      onChange={(ev) =>
                        editExercise(i, (x) => ({
                          ...x,
                          sets: x.sets.map((s2, j) => (j === k ? { ...s2, reps: Math.max(0, Number(ev.target.value) || 0) } : s2)),
                        }))
                      }
                    />
                    <span>rep</span>
                  </label>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <p className="muted small center">Không đạt thì sửa lại số rep trước khi tích. Đủ rep tối đa ở mọi set → buổi sau tự tăng tạ.</p>
      <div className="row gap">
        <ConfirmButton className="btn ghost grow" confirmLabel="Bấm lần nữa để huỷ" onConfirm={cancel}>
          Huỷ buổi
        </ConfirmButton>
        <ConfirmButton className="btn primary grow" confirmLabel="Chưa tích set nào — bấm lần nữa để lưu" skip={doneSets > 0} onConfirm={finish}>
          Hoàn thành
        </ConfirmButton>
      </div>
    </div>
  )
}
