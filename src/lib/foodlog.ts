import { DISHES, type Dish } from '../data/dishes'
import type { FoodEntry } from '../types'
import type { Macros } from './nutrition'

/** Bỏ dấu tiếng Việt để tìm "pho" ra "Phở" */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim()
}

export function searchDishes(query: string, limit = 8): Dish[] {
  const q = normalize(query)
  if (!q) return []
  const words = q.split(/\s+/)
  return DISHES.map((dish) => {
    const name = normalize(dish.name)
    const hay = `${name} ${normalize(dish.tags ?? '')}`
    if (!words.every((w) => hay.includes(w))) return null
    const score = name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2
    return { dish, score }
  })
    .filter((x): x is { dish: Dish; score: number } => x !== null)
    .sort((a, b) => a.score - b.score || a.dish.name.length - b.dish.name.length)
    .slice(0, limit)
    .map((x) => x.dish)
}

export function entryMacros(e: FoodEntry): Macros {
  return { kcal: e.kcal * e.qty, protein: e.protein * e.qty, carbs: e.carbs * e.qty, fat: e.fat * e.qty }
}

export function totalMacros(entries: FoodEntry[]): Macros {
  return entries.reduce(
    (a, e) => {
      const m = entryMacros(e)
      return { kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export type Verdict = { status: 'short' | 'ok' | 'over'; diff: number }

/** Sai số ±150 kcal coi như đủ */
export function verdict(eatenKcal: number, targetKcal: number, tolerance = 150): Verdict {
  const diff = Math.round(targetKcal - eatenKcal)
  if (diff > tolerance) return { status: 'short', diff }
  if (diff < -tolerance) return { status: 'over', diff: -diff }
  return { status: 'ok', diff: Math.abs(diff) }
}

/** Gợi ý món bù calo: vừa phần calo còn thiếu, ưu tiên nhiều protein nếu còn thiếu protein */
export function suggestFillers(kcalLeft: number, proteinLeft: number, count = 3): Dish[] {
  const pool = DISHES.filter((d) => d.kcal <= kcalLeft + 100 && d.kcal >= 90 && !['bia', 'nuoc-ngot', 'tra-sua'].includes(d.id))
  const needProtein = proteinLeft > 20
  return pool
    .map((d) => ({ d, score: needProtein ? (d.protein * 4) / d.kcal : d.kcal / Math.max(kcalLeft, 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.d)
}

/** Món hay ăn nhất (theo lịch sử) để chọn nhanh */
export function frequentDishes(log: Record<string, FoodEntry[]>, limit = 8): { name: string; entry: FoodEntry; count: number }[] {
  const map = new Map<string, { entry: FoodEntry; count: number }>()
  for (const entries of Object.values(log)) for (const e of entries) {
    const cur = map.get(e.name)
    map.set(e.name, { entry: cur && cur.entry.time > e.time ? cur.entry : e, count: (cur?.count ?? 0) + 1 })
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
