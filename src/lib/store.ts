import { useEffect, useState } from 'react'
import type { AppState, FoodEntry, SessionLog } from '../types'
import { byMonth, useCloudSync, type Chunks } from './cloud'

const KEY = 'gymplan:v1'

export const DEFAULT_STATE: AppState = {
  version: 1,
  profile: { sex: 'male', age: 25, heightCm: 170, weightKg: 65, activity: 1.55, goal: 'bulk' },
  programId: 'my4',
  progress: {},
  logs: [],
  draft: null,
  meals: {},
  foodLog: {},
  bodyWeights: [],
  trainingDays: [0, 1, 3, 4],
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    const saved = { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<AppState>) }
    // Chưa tập buổi nào với chương trình mặc định cũ → chuyển sang chương trình 4 buổi
    if (saved.logs.length === 0 && saved.programId === 'fullbody3') saved.programId = 'my4'
    return saved
  } catch {
    return DEFAULT_STATE
  }
}

/** Chia dữ liệu thành các document nhỏ để lưu lên Claude */
export function appToChunks(s: AppState): Chunks {
  // draft (buổi đang tập dở) giữ riêng trên từng máy
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { logs, foodLog, draft, ...core } = s
  const chunks: Chunks = { core: core as unknown as Record<string, unknown> }
  for (const [m, items] of Object.entries(byMonth(logs, (l) => l.date))) chunks[`logs-${m}`] = { items }
  const days = Object.keys(foodLog).filter((d) => foodLog[d].length > 0)
  for (const [m, ds] of Object.entries(byMonth(days, (d) => d))) chunks[`food-${m}`] = { days: Object.fromEntries(ds.map((d) => [d, foodLog[d]])) }
  return chunks
}

export function appFromChunks(c: Chunks): AppState {
  const core = (c.core ?? {}) as Partial<AppState>
  const logs: SessionLog[] = []
  const foodLog: Record<string, FoodEntry[]> = {}
  for (const [k, body] of Object.entries(c)) {
    if (k.startsWith('logs-')) logs.push(...((body.items as SessionLog[]) ?? []))
    if (k.startsWith('food-')) Object.assign(foodLog, body.days as Record<string, FoodEntry[]>)
  }
  logs.sort((a, b) => a.finishedAt - b.finishedAt)
  return { ...DEFAULT_STATE, ...core, draft: null, logs, foodLog }
}

/** Máy này chưa có dữ liệu gì của người dùng */
export function isPristine(s: AppState): boolean {
  return (
    s.logs.length === 0 &&
    Object.keys(s.foodLog).length === 0 &&
    Object.keys(s.progress).length === 0 &&
    s.bodyWeights.length === 0 &&
    JSON.stringify(s.profile) === JSON.stringify(DEFAULT_STATE.profile)
  )
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage full / blocked — keep in memory */
    }
  }, [state])
  useCloudSync('app', state, (remote) => setState((cur) => ({ ...remote, draft: cur.draft })), appToChunks, appFromChunks, isPristine)
  return [state, setState] as const
}

export type Update = (fn: (s: AppState) => AppState) => void

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
