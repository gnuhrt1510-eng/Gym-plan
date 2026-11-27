import { useState, type ComponentType } from 'react'
import { useAppState, type Update } from './lib/store'
import { formatDate, today } from './lib/date'
import { useSyncStatus } from './lib/cloud'
import WorkoutTab from './components/WorkoutTab'
import ProgressTab from './components/ProgressTab'
import MealTab from './components/MealTab'
import SettingsTab from './components/SettingsTab'
import RunTab, { useRuns } from './components/RunTab'
import { IconBolt, IconBowl, IconChart, IconDumbbell, IconRun, IconSliders } from './components/Icons'

type Tab = 'workout' | 'run' | 'progress' | 'meal' | 'settings'

const TABS: { id: Tab; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'workout', label: 'Tập', Icon: IconDumbbell },
  { id: 'run', label: 'Chạy', Icon: IconRun },
  { id: 'meal', label: 'Ăn uống', Icon: IconBowl },
  { id: 'progress', label: 'Tiến độ', Icon: IconChart },
  { id: 'settings', label: 'Cài đặt', Icon: IconSliders },
]

export default function App() {
  const [state, setState] = useAppState()
  const [runs, setRuns] = useRuns()
  const [tab, setTab] = useState<Tab>('workout')
  const update: Update = (fn) => setState((s) => fn(s))

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">
          <IconBolt size={18} /> GYM PLAN
        </span>
        <span className="topbar-right">
          <SaveBadge />
          <span className="topbar-date">{formatDate(today())}</span>
        </span>
      </div>
      <main className="content">
        {tab === 'workout' && <WorkoutTab state={state} update={update} />}
        {tab === 'run' && <RunTab body={{ weightKg: state.profile.weightKg, heightCm: state.profile.heightCm }} runs={runs} setRuns={setRuns} />}
        {tab === 'progress' && <ProgressTab state={state} update={update} runs={runs} />}
        {tab === 'meal' && <MealTab state={state} update={update} onOpenSettings={() => {
              setTab('settings')
              window.scrollTo(0, 0)
            }} />}
        {tab === 'settings' && <SettingsTab state={state} update={update} replace={setState} />}
      </main>
      <nav className="tabbar" aria-label="Điều hướng">
        <div className="tabbar-inner">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => {
                setTab(id)
                window.scrollTo(0, 0)
              }} aria-current={tab === id ? 'page' : undefined}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function SaveBadge() {
  const { status } = useSyncStatus()
  const map = {
    synced: ['ok', 'Đã lưu'],
    saving: ['busy', 'Đang lưu…'],
    connecting: ['busy', 'Đang tải…'],
    local: ['local', 'Lưu trên máy'],
    error: ['err', 'Chưa lưu được'],
  } as const
  const [cls, label] = map[status]
  return (
    <span className={`save-badge ${cls}`} role="status" title={status === 'local' ? 'Dữ liệu lưu trong trình duyệt của máy này' : 'Dữ liệu lưu vào tài khoản Claude của bạn'}>
      <i /> {label}
    </span>
  )
}
