import { useState } from 'react'
import { useAppState, type Update } from './lib/store'
import WorkoutTab from './components/WorkoutTab'
import ProgressTab from './components/ProgressTab'
import MealTab from './components/MealTab'
import SettingsTab from './components/SettingsTab'

type Tab = 'workout' | 'progress' | 'meal' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'workout', label: 'Tập luyện', icon: '🏋️' },
  { id: 'progress', label: 'Tiến độ', icon: '📈' },
  { id: 'meal', label: 'Meal plan', icon: '🥗' },
  { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
]

export default function App() {
  const [state, setState] = useAppState()
  const [tab, setTab] = useState<Tab>('workout')
  const update: Update = (fn) => setState((s) => fn(s))

  return (
    <div className="app">
      <main className="content">
        {tab === 'workout' && <WorkoutTab state={state} update={update} />}
        {tab === 'progress' && <ProgressTab state={state} update={update} />}
        {tab === 'meal' && <MealTab state={state} update={update} onOpenSettings={() => setTab('settings')} />}
        {tab === 'settings' && <SettingsTab state={state} update={update} replace={setState} />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
