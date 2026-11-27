import { useEffect, useState } from 'react'
import { EXERCISE_MAP, PROGRAM_MAP } from '../data/programs'
import { formatDate, startOfWeek, today } from '../lib/date'
import { currentWeight, formatWeight, newExerciseLog, nextProgress } from '../lib/progression'
import { uid, type Update } from '../lib/store'
import ConfirmButton from './ConfirmButton'
import type { AppState, Draft, ExerciseLog, Outcome, ProgramDay, SessionLog } from '../types'

const OUTCOME_TEXT: Record<Outcome, string> = {
  up: '↑ Tăng tạ',
  hold: '→ Giữ tạ, cố thêm rep',
  stall: '⚠ Chưa đạt, thử lại',
  deload: '↓ Giảm 10% để phục hồi',
}

interface Props {
  state: AppState
  update: Update
}

export default function WorkoutTab({ state, update }: Props) {
  const program = PROGRAM_MAP[state.programId]
  const [summary, setSummary] = useState<SessionLog | null>(null)

  if (state.draft) {
    return (
      <ActiveSession
        draft={state.draft}
        progress={state.progress}
        update={update}
        onFinish={(log) => setSummary(log)}
      />
    )
  }

  const weekStart = startOfWeek(today())
  const weekLogs = state.logs.filter((l) => l.date >= weekStart && l.programId === program.id)
  const lastLog = [...state.logs].reverse().find((l) => l.programId === program.id)
  const lastIdx = lastLog ? program.days.findIndex((d) => d.id === lastLog.dayId) : -1
  const nextDay = program.days[(lastIdx + 1) % program.days.length]

  const start = (day: ProgramDay) => {
    update((s) => ({
      ...s,
      draft: {
        programId: program.id,
        dayId: day.id,
        startedAt: Date.now(),
        exercises: day.exercises.map((pe) => newExerciseLog(pe, currentWeight(EXERCISE_MAP[pe.exerciseId], s.progress))),
      },
    }))
  }

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{program.name}</h1>
        <p className="muted">{program.description}</p>
      </header>

      {summary && <SummaryCard log={summary} onClose={() => setSummary(null)} />}

      <section className="card">
        <div className="row between">
          <h2>Tuần này</h2>
          <span className="pill">
            {Math.min(weekLogs.length, program.days.length)}/{program.days.length} buổi
          </span>
        </div>
        <div className="week-grid" style={{ gridTemplateColumns: `repeat(${program.days.length === 4 ? 2 : 3}, 1fr)` }}>
          {program.days.map((d) => {
            const done = weekLogs.some((l) => l.dayId === d.id)
            return (
              <div key={d.id} className={`week-day ${done ? 'done' : ''}`}>
                <span className="check">{done ? '✓' : ''}</span>
                <span>{d.name}</span>
              </div>
            )
          })}
        </div>
      </section>

      {program.days.map((day) => (
        <section key={day.id} className={`card ${day.id === nextDay.id ? 'highlight' : ''}`}>
          <div className="row between">
            <div>
              <h2>
                {day.name} {day.id === nextDay.id && <span className="pill accent">Buổi tiếp theo</span>}
              </h2>
              <p className="muted small">{day.focus}</p>
            </div>
            <button className="btn primary" onClick={() => start(day)}>
              Bắt đầu
            </button>
          </div>
          <ul className="ex-list">
            {day.exercises.map((pe) => {
              const ex = EXERCISE_MAP[pe.exerciseId]
              return (
                <li key={pe.exerciseId}>
                  <span>{ex.name}</span>
                  <span className="muted small">
                    {pe.sets}×{pe.repsMin}-{pe.repsMax} @ <b>{formatWeight(ex, currentWeight(ex, state.progress))}</b>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function SummaryCard({ log, onClose }: { log: SessionLog; onClose: () => void }) {
  return (
    <section className="card success">
      <div className="row between">
        <h2>🎉 Xong {log.dayName}!</h2>
        <button className="btn ghost" onClick={onClose}>
          Đóng
        </button>
      </div>
      <p className="muted small">Mức tạ cho buổi sau:</p>
      <ul className="ex-list">
        {log.changes.map((c) => (
          <li key={c.exerciseId}>
            <span>{EXERCISE_MAP[c.exerciseId].name}</span>
            <span className={`outcome ${c.outcome}`}>
              {c.from} → <b>{formatWeight(EXERCISE_MAP[c.exerciseId], c.to)}</b> · {OUTCOME_TEXT[c.outcome]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function useRestTimer() {
  const [endAt, setEndAt] = useState<number | null>(null)
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
    start: (sec: number) => {
      setNow(Date.now())
      setEndAt(Date.now() + sec * 1000)
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

  const totalSets = draft.exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  const editExercise = (i: number, fn: (e: ExerciseLog) => ExerciseLog) =>
    update((s) => (s.draft ? { ...s, draft: { ...s.draft, exercises: s.draft.exercises.map((e, j) => (j === i ? fn(e) : e)) } } : s))

  const toggleSet = (i: number, k: number) => {
    const ex = draft.exercises[i]
    const willBeDone = !ex.sets[k].done
    editExercise(i, (e) => ({ ...e, sets: e.sets.map((st, j) => (j === k ? { ...st, done: willBeDone } : st)) }))
    if (willBeDone) timer.start(ex.restSec)
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

  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{day.name}</h1>
        <p className="muted">
          {formatDate(today())} · {doneSets}/{totalSets} set
        </p>
        <div className="bar">
          <div style={{ width: `${pct}%` }} />
        </div>
      </header>

      {timer.remaining > 0 && (
        <div className="rest-banner">
          <span>
            ⏱ Nghỉ {Math.floor(timer.remaining / 60)}:{String(timer.remaining % 60).padStart(2, '0')}
          </span>
          <button className="btn ghost" onClick={timer.stop}>
            Bỏ qua
          </button>
        </div>
      )}

      {draft.exercises.map((e, i) => {
        const def = EXERCISE_MAP[e.exerciseId]
        const allDone = e.sets.every((s) => s.done)
        return (
          <section key={e.exerciseId + i} className={`card ${allDone ? 'done-card' : ''}`}>
            <div className="row between">
              <div>
                <h2>
                  {allDone && '✅ '}
                  {def.name}
                </h2>
                <p className="muted small">
                  {def.nameEn} · {def.muscle} · mục tiêu {e.repsMin}-{e.repsMax} rep
                </p>
              </div>
            </div>
            <div className="weight-ctrl">
              <button className="btn round" onClick={() => editExercise(i, (x) => ({ ...x, weight: Math.max(0, x.weight - def.increment) }))}>
                −
              </button>
              <label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={e.weight}
                  onChange={(ev) => editExercise(i, (x) => ({ ...x, weight: Number(ev.target.value) || 0 }))}
                />
                <span>{def.bodyweight ? 'kg đeo thêm' : 'kg'}</span>
              </label>
              <button className="btn round" onClick={() => editExercise(i, (x) => ({ ...x, weight: x.weight + def.increment }))}>
                +
              </button>
            </div>
            <div className="sets">
              {e.sets.map((st, k) => (
                <div key={k} className={`set-row ${st.done ? 'done' : ''}`}>
                  <span className="set-no">Set {k + 1}</span>
                  <label className="reps">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={st.reps}
                      onChange={(ev) =>
                        editExercise(i, (x) => ({
                          ...x,
                          sets: x.sets.map((ss, j) => (j === k ? { ...ss, reps: Math.max(0, Number(ev.target.value) || 0) } : ss)),
                        }))
                      }
                    />
                    <span>rep</span>
                  </label>
                  <button className={`checkbox ${st.done ? 'on' : ''}`} onClick={() => toggleSet(i, k)} aria-label={`Hoàn thành set ${k + 1}`}>
                    {st.done ? '✓' : ''}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <p className="muted small center">Ghi lại số rep thực tế nếu không đạt. Đủ rep tối đa ở mọi set → buổi sau tự tăng tạ.</p>
      <div className="row gap">
        <ConfirmButton className="btn ghost grow" confirmLabel="Bấm lần nữa để huỷ" onConfirm={cancel}>
          Huỷ
        </ConfirmButton>
        <ConfirmButton className="btn primary grow" confirmLabel="Chưa tích set nào — bấm lần nữa để lưu" skip={doneSets > 0} onConfirm={finish}>
          Hoàn thành buổi tập
        </ConfirmButton>
      </div>
    </div>
  )
}
