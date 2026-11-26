import { useEffect, useState } from 'react'
import type { AppState } from '../types'

const KEY = 'gymplan:v1'

export const DEFAULT_STATE: AppState = {
  version: 1,
  profile: { sex: 'male', age: 25, heightCm: 170, weightKg: 65, activity: 1.55, goal: 'bulk' },
  programId: 'fullbody3',
  progress: {},
  logs: [],
  draft: null,
  meals: {},
  bodyWeights: [],
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<AppState>) }
  } catch {
    return DEFAULT_STATE
  }
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
  return [state, setState] as const
}

export type Update = (fn: (s: AppState) => AppState) => void

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
