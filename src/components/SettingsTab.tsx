import { EXERCISE_MAP, PROGRAMS, PROGRAM_MAP } from '../data/programs'
import { ACTIVITY_LEVELS, computeTargets, GOAL_LABEL } from '../lib/nutrition'
import { currentWeight } from '../lib/progression'
import { DEFAULT_STATE, type Update } from '../lib/store'
import type { AppState, Goal, Profile } from '../types'

export default function SettingsTab({ state, update, replace }: { state: AppState; update: Update; replace: (s: AppState) => void }) {
  const p = state.profile
  const t = computeTargets(p)
  const setProfile = (patch: Partial<Profile>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
  const num = (v: string) => Number(v) || 0

  const program = PROGRAM_MAP[state.programId]
  const exerciseIds = [...new Set(program.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))]

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gym-plan-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = (file: File) => {
    file.text().then((txt) => {
      try {
        const data = JSON.parse(txt) as AppState
        if (data.version !== 1 || !Array.isArray(data.logs)) throw new Error('bad')
        replace({ ...DEFAULT_STATE, ...data })
        alert('Đã nhập dữ liệu.')
      } catch {
        alert('File không hợp lệ.')
      }
    })
  }

  return (
    <div className="stack">
      <header className="page-head">
        <h1>Cài đặt</h1>
      </header>

      <section className="card">
        <h2>Thông số cơ thể</h2>
        <div className="form-grid">
          <label>
            Giới tính
            <select value={p.sex} onChange={(e) => setProfile({ sex: e.target.value as Profile['sex'] })}>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </label>
          <label>
            Tuổi
            <input type="number" inputMode="numeric" value={p.age} onChange={(e) => setProfile({ age: num(e.target.value) })} />
          </label>
          <label>
            Chiều cao (cm)
            <input type="number" inputMode="numeric" value={p.heightCm} onChange={(e) => setProfile({ heightCm: num(e.target.value) })} />
          </label>
          <label>
            Cân nặng (kg)
            <input type="number" inputMode="decimal" value={p.weightKg} onChange={(e) => setProfile({ weightKg: num(e.target.value) })} />
          </label>
          <label className="full">
            Mức vận động
            <select value={p.activity} onChange={(e) => setProfile({ activity: Number(e.target.value) })}>
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Mục tiêu
            <div className="segmented">
              {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
                <button key={g} className={p.goal === g ? 'on' : ''} onClick={() => setProfile({ goal: g })}>
                  {GOAL_LABEL[g]}
                </button>
              ))}
            </div>
          </label>
        </div>
        <div className="stats">
          <div className="stat">
            <b>{t.bmr}</b>
            <span>BMR</span>
          </div>
          <div className="stat">
            <b>{t.tdee}</b>
            <span>TDEE</span>
          </div>
          <div className="stat accent">
            <b>{t.kcal}</b>
            <span>kcal mục tiêu</span>
          </div>
        </div>
        <p className="muted small">
          Macro/ngày: Protein {t.protein}g · Carb {t.carbs}g · Fat {t.fat}g. Tính theo công thức Mifflin–St Jeor; theo dõi cân nặng 2–3 tuần rồi điều chỉnh.
        </p>
      </section>

      <section className="card">
        <h2>Chương trình tập</h2>
        <div className="program-list">
          {PROGRAMS.map((pr) => (
            <button
              key={pr.id}
              className={`program ${pr.id === state.programId ? 'on' : ''}`}
              disabled={!!state.draft}
              onClick={() => update((s) => ({ ...s, programId: pr.id }))}
            >
              <b>{pr.name}</b>
              <span className="muted small">{pr.description}</span>
            </button>
          ))}
        </div>
        {state.draft && <p className="muted small">Hoàn thành hoặc huỷ buổi đang tập để đổi chương trình.</p>}
      </section>

      <section className="card">
        <h2>Mức tạ hiện tại</h2>
        <p className="muted small">Đặt mức tạ khởi điểm phù hợp với bạn. App sẽ tự cập nhật sau mỗi buổi.</p>
        <ul className="ex-list">
          {exerciseIds.map((id) => {
            const ex = EXERCISE_MAP[id]
            return (
              <li key={id}>
                <span>
                  {ex.name} <span className="muted small">(+{ex.increment}kg/lần)</span>
                </span>
                <input
                  className="mini"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={currentWeight(ex, state.progress)}
                  onChange={(e) =>
                    update((s) => ({ ...s, progress: { ...s.progress, [id]: { weight: num(e.target.value), stalls: s.progress[id]?.stalls ?? 0 } } }))
                  }
                />
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card">
        <h2>Dữ liệu</h2>
        <p className="muted small">Dữ liệu lưu trên trình duyệt của máy này. Xuất file để sao lưu hoặc chuyển máy.</p>
        <div className="row gap wrap">
          <button className="btn" onClick={exportData}>
            ⬇ Xuất JSON
          </button>
          <label className="btn">
            ⬆ Nhập JSON
            <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </label>
          <button className="btn danger" onClick={() => confirm('Xoá toàn bộ dữ liệu?') && replace(DEFAULT_STATE)}>
            Xoá hết
          </button>
        </div>
      </section>
    </div>
  )
}
