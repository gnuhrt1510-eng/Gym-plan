import { FOOD_MAP, MEAL_TEMPLATES, SLOT_SHARE, SLOTS, TEMPLATE_MAP } from '../data/foods'
import type { Food, MealDayState, MealSlot, MealTemplate, Profile } from '../types'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Targets extends Macros {
  bmr: number
  tdee: number
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Ít vận động (ngồi nhiều)' },
  { value: 1.375, label: 'Nhẹ (tập 1–3 buổi/tuần)' },
  { value: 1.55, label: 'Vừa (tập 3–5 buổi/tuần)' },
  { value: 1.725, label: 'Nhiều (tập 6–7 buổi/tuần)' },
  { value: 1.9, label: 'Rất nhiều (lao động nặng + tập)' },
]

export const GOAL_LABEL = { cut: 'Giảm mỡ', maintain: 'Giữ cân', bulk: 'Tăng cơ' } as const

const GOAL_ADJUST = { cut: -0.2, maintain: 0, bulk: 0.1 } as const
const PROTEIN_PER_KG = { cut: 2.2, maintain: 1.8, bulk: 2.0 } as const
const FAT_SHARE = 0.25

/** Mifflin–St Jeor */
export function bmr(p: Profile): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
}

export function computeTargets(p: Profile): Targets {
  const b = bmr(p)
  const tdee = b * p.activity
  const kcal = Math.round(tdee * (1 + GOAL_ADJUST[p.goal]))
  const protein = Math.round(p.weightKg * PROTEIN_PER_KG[p.goal])
  const fat = Math.round((kcal * FAT_SHARE) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { bmr: Math.round(b), tdee: Math.round(tdee), kcal, protein, carbs, fat }
}

export function foodMacros(food: Food, grams: number): Macros {
  const f = grams / 100
  return { kcal: food.kcal * f, protein: food.protein * f, carbs: food.carbs * f, fat: food.fat * f }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export interface MealItem {
  food: Food
  grams: number
  macros: Macros
}

export interface PlannedMeal {
  slot: MealSlot
  template: MealTemplate
  items: MealItem[]
  macros: Macros
  targetKcal: number
}

function roundPortion(food: Food, grams: number): number {
  if (food.unit) {
    const count = Math.max(1, Math.round(grams / food.unit.grams))
    return count * food.unit.grams
  }
  return Math.max(5, Math.round(grams / 5) * 5)
}

type Group = 'protein' | 'carb' | 'fat'

/** Nhóm đạm nếu ≥30% calo từ protein (trứng, đậu phụ, cá hồi…); còn lại theo macro trội hơn */
export function foodGroup(food: Food): Group {
  const p = food.protein * 4
  const c = food.carbs * 4
  const f = food.fat * 9
  if (p / (p + c + f) >= 0.3) return 'protein'
  return c >= f ? 'carb' : 'fat'
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/**
 * Scale khẩu phần để bữa ăn sát mục tiêu protein & carb (fat theo sau).
 * Nhóm đạm và nhóm tinh bột được scale độc lập bằng hệ 2 phương trình;
 * món cố định và món nhiều béo giữ nguyên. Nếu thiếu một nhóm thì scale theo calo.
 */
export function scaleMeal(template: MealTemplate, target: Macros): PlannedMeal {
  const base = template.items.map((it) => ({ it, food: FOOD_MAP[it.foodId], m: foodMacros(FOOD_MAP[it.foodId], it.grams) }))
  const groupOf = (x: (typeof base)[number]): Group | 'fixed' => (x.it.fixed ? 'fixed' : foodGroup(x.food))
  const sumBy = (g: Group | 'fixed') => sumMacros(base.filter((x) => groupOf(x) === g).map((x) => x.m))
  const P = sumBy('protein')
  const C = sumBy('carb')
  const F = sumBy('fat')
  const rest = sumMacros([sumBy('fixed'), F])

  let fp = 1
  let fc = 1
  const needP = target.protein - rest.protein
  const needC = target.carbs - rest.carbs
  const det = P.protein * C.carbs - C.protein * P.carbs
  if (P.kcal > 0 && C.kcal > 0 && Math.abs(det) > 1e-6) {
    fp = (needP * C.carbs - C.protein * needC) / det
    fc = (P.protein * needC - needP * P.carbs) / det
  } else {
    const scalable = P.kcal + C.kcal
    fp = fc = scalable > 0 ? (target.kcal - rest.kcal) / scalable : 1
  }
  fp = clamp(fp, 0.4, 3)
  fc = clamp(fc, 0.4, 3)
  // Nhóm béo (dầu, bơ, đậu phộng) bù phần fat còn thiếu
  const fixedF = sumBy('fixed').fat
  const ff = F.fat > 0 ? clamp((target.fat - fixedF - fp * P.fat - fc * C.fat) / F.fat, 0.5, 3) : 1

  const items = base.map(({ it, food }) => {
    const g = it.fixed ? 'fixed' : foodGroup(food)
    const factor = g === 'protein' ? fp : g === 'carb' ? fc : ff
    const grams = g === 'fixed' ? it.grams : roundPortion(food, it.grams * factor)
    return { food, grams, macros: foodMacros(food, grams) }
  })
  return { slot: template.slot, template, items, macros: sumMacros(items.map((i) => i.macros)), targetKcal: target.kcal }
}

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function templatesFor(slot: MealSlot): MealTemplate[] {
  return MEAL_TEMPLATES.filter((t) => t.slot === slot)
}

/** Món mặc định cho một ngày — cố định theo ngày để không đổi mỗi lần mở app */
export function defaultTemplateId(date: string, slot: MealSlot): string {
  const list = templatesFor(slot)
  return list[hash(`${date}:${slot}`) % list.length].id
}

export function planDay(date: string, targets: Macros, state?: MealDayState): PlannedMeal[] {
  return SLOTS.map((slot) => {
    const id = state?.overrides[slot] ?? defaultTemplateId(date, slot)
    const template = TEMPLATE_MAP[id] ?? TEMPLATE_MAP[defaultTemplateId(date, slot)]
    const share = SLOT_SHARE[slot]
    return scaleMeal(template, {
      kcal: targets.kcal * share,
      protein: targets.protein * share,
      carbs: targets.carbs * share,
      fat: targets.fat * share,
    })
  })
}

export function nextTemplateId(slot: MealSlot, currentId: string): string {
  const list = templatesFor(slot)
  const idx = list.findIndex((t) => t.id === currentId)
  return list[(idx + 1) % list.length].id
}

export interface ShoppingItem {
  food: Food
  grams: number
}

export function shoppingList(days: PlannedMeal[][]): ShoppingItem[] {
  const totals = new Map<string, number>()
  for (const day of days) for (const meal of day) for (const it of meal.items) {
    totals.set(it.food.id, (totals.get(it.food.id) ?? 0) + it.grams)
  }
  return [...totals.entries()]
    .map(([id, grams]) => ({ food: FOOD_MAP[id], grams }))
    .sort((a, b) => a.food.name.localeCompare(b.food.name, 'vi'))
}

export function formatAmount(food: Food, grams: number): string {
  if (food.unit) {
    const count = Math.round((grams / food.unit.grams) * 10) / 10
    return `${count} ${food.unit.label} (${Math.round(grams)}g)`
  }
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${Math.round(grams)} g`
}
