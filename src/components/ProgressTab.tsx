import { useMemo, useState } from 'react'
import { EXERCISE_MAP } from '../data/programs'
import { formatDate, startOfWeek, today } from '../lib/date'
import { estimate1RM, logVolume } from '../lib/progression'
import type { Update } from '../lib/store'
import type { AppState } from '../types'
import ConfirmButton from './ConfirmButton'
import LineChart from './LineChart'

const short = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}

export default function ProgressTab({ state, update }: { state: AppState; update: Update }) {
  const exerciseIds = useMemo(() => {
    const ids = new Set<string>()
    state.logs.forEach((l) => l.exercises.forEach((e) => ids.add(e.exerciseId)))
    return [...ids]
  }, [state.logs])

  const [selected, setSelected] = useState<string>(exerciseIds[0] ?? '')
  const exId = exerciseIds.includes(selected) ? selected : exerciseIds[0]
  const [bw, setBw] = useState('')

  const history = state.logs.flatMap((l) =>
    l.exercises
      .filter((e) => e.exerciseId === exId && e.sets.some((s) => s.done))
      .map((e) => {
        const best = Math.max(...e.sets.filter((s) => s.done).map((s) => s.reps))
        return { date: l.date, weight: e.weight, reps: e.sets.map((s) => (s.done ? s.reps : 0)), oneRM: estimate1RM(e.weight, best) }
      }),
  )

  const weekStart = startOfWeek(today())
  const thisWeek = state.logs.filter((l) => l.date >= weekStart).length
  const totalVolume = state.logs.reduce((sum, l) => sum + l.exercises.reduce((v, e) => v + logVolume(e), 0), 0)

  const addBodyWeight = () => {
    const kg = Number(bw)
    if (!kg) return
    const date = today()
    update((s) => ({
      ...s,
      bodyWeights: [...s.bodyWeights.filter((b) => b.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date)),
      profile: { ...s.profile, weightKg: kg },
    }))
    setBw('')
  }

  const deleteLog = (id: string) => update((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) }))

  return (
    <div className="stack">
      <header className="page-head">
        <h1>Tiến độ</h1>
      </header>

      <div className="stats">
        <div className="stat">
          <b>{state.logs.length}</b>
          <span>Tổng buổi</span>
        </div>
        <div className="stat">
          <b>{thisWeek}</b>
          <span>Tuần này</span>
        </div>
        <div className="stat">
          <b>{(totalVolume / 1000).toFixed(1)}t</b>
          <span>Tổng khối lượng</span>
        </div>
      </div>

      <section className="card">
        <h2>Khối lượng tạ theo thời gian</h2>
        {exerciseIds.length === 0 ? (
          <p className="muted small">Hoàn thành buổi tập đầu tiên để xem biểu đồ.</p>
        ) : (
          <>
            <select value={exId} onChange={(e) => setSelected(e.target.value)}>
              {exerciseIds.map((id) => (
                <option key={id} value={id}>
                  {EXERCISE_MAP[id]?.name ?? id}
                </option>
              ))}
            </select>
            <LineChart
              series={[
                { name: 'Tạ tập', className: 's1', points: history.map((h) => ({ label: short(h.date), value: h.weight })) },
                { name: '1RM ước tính', className: 's2', points: history.map((h) => ({ label: short(h.date), value: h.oneRM })) },
              ]}
            />
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Tạ</th>
                  <th>Rep từng set</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().slice(0, 10).map((h, i) => (
                  <tr key={i}>
                    <td>{formatDate(h.date)}</td>
                    <td>{h.weight} kg</td>
                    <td>{h.reps.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="card">
        <h2>Cân nặng cơ thể</h2>
        <div className="row gap">
          <input type="number" inputMode="decimal" step="0.1" placeholder={`${state.profile.weightKg} kg`} value={bw} onChange={(e) => setBw(e.target.value)} />
          <button className="btn primary" onClick={addBodyWeight}>
            Ghi hôm nay
          </button>
        </div>
        <LineChart series={[{ name: 'Cân nặng', className: 's3', points: state.bodyWeights.map((b) => ({ label: short(b.date), value: b.kg })) }]} />
      </section>

      <section className="card">
        <h2>Lịch sử buổi tập</h2>
        {state.logs.length === 0 && <p className="muted small">Chưa có buổi nào.</p>}
        <ul className="history">
          {[...state.logs].reverse().map((l) => {
            const done = l.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
            const total = l.exercises.reduce((n, e) => n + e.sets.length, 0)
            const mins = Math.round((l.finishedAt - l.startedAt) / 60000)
            return (
              <li key={l.id}>
                <div>
                  <b>{l.dayName}</b> <span className="muted small">· {formatDate(l.date)}</span>
                  <div className="muted small">
                    ✓ {done}/{total} set · {mins} phút · {l.changes.filter((c) => c.outcome === 'up').length} bài tăng tạ
                  </div>
                </div>
                <ConfirmButton className="btn ghost small" confirmLabel="Xoá?" ariaLabel="Xoá buổi tập" onConfirm={() => deleteLog(l.id)}>
                  ✕
                </ConfirmButton>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
