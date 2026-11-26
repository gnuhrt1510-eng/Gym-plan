import { describe, expect, it } from 'vitest'
import { EXERCISE_MAP } from '../data/programs'
import { MEAL_TEMPLATES, SLOT_SHARE } from '../data/foods'
import { computeTargets, planDay, scaleMeal } from './nutrition'
import { estimate1RM, nextProgress, newExerciseLog } from './progression'
import { addDays, startOfWeek } from './date'

const squat = EXERCISE_MAP.squat
const plan = { exerciseId: 'squat', sets: 3, repsMin: 5, repsMax: 8, restSec: 120 }

describe('progression', () => {
  it('tăng tạ khi mọi set đạt rep tối đa', () => {
    const log = newExerciseLog(plan, 60)
    log.sets.forEach((s) => (s.done = true))
    expect(nextProgress(log, squat)).toEqual({ state: { weight: 65, stalls: 0 }, outcome: 'up' })
  })

  it('giữ tạ khi nằm trong khoảng rep', () => {
    const log = newExerciseLog(plan, 60)
    log.sets.forEach((s) => ((s.done = true), (s.reps = 6)))
    expect(nextProgress(log, squat).outcome).toBe('hold')
  })

  it('giảm 10% sau 3 lần không đạt liên tiếp', () => {
    const log = newExerciseLog(plan, 100)
    log.sets.forEach((s) => ((s.done = true), (s.reps = 3)))
    expect(nextProgress(log, squat, { weight: 100, stalls: 0 })).toEqual({ state: { weight: 100, stalls: 1 }, outcome: 'stall' })
    expect(nextProgress(log, squat, { weight: 100, stalls: 2 })).toEqual({ state: { weight: 90, stalls: 0 }, outcome: 'deload' })
  })

  it('set chưa tích không tính là đạt', () => {
    const log = newExerciseLog(plan, 60)
    log.sets[0].done = true
    expect(nextProgress(log, squat).outcome).toBe('stall')
  })

  it('1RM Epley', () => {
    expect(estimate1RM(100, 1)).toBe(100)
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1)
  })
})

describe('nutrition', () => {
  const profile = { sex: 'male' as const, age: 25, heightCm: 175, weightKg: 70, activity: 1.55, goal: 'maintain' as const }

  it('tính TDEE và macro', () => {
    const t = computeTargets(profile)
    expect(t.bmr).toBe(1674)
    expect(t.kcal).toBe(2594)
    expect(t.protein).toBe(126)
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeCloseTo(t.kcal, -1)
  })

  it('mỗi món scale sát calo & protein của bữa', () => {
    const t = computeTargets(profile)
    for (const tpl of MEAL_TEMPLATES) {
      const sh = SLOT_SHARE[tpl.slot]
      const meal = scaleMeal(tpl, { kcal: t.kcal * sh, protein: t.protein * sh, carbs: t.carbs * sh, fat: t.fat * sh })
      expect(Math.abs(meal.macros.kcal - t.kcal * sh) / (t.kcal * sh), tpl.id).toBeLessThan(0.2)
      expect(meal.macros.protein / (t.protein * sh), tpl.id).toBeGreaterThan(0.6)
    }
  })

  it('tổng ngày sát macro mục tiêu với mọi tổ hợp mặc định trong 30 ngày', () => {
    const t = computeTargets(profile)
    for (let i = 0; i < 30; i++) {
      const day = planDay(addDays('2026-11-01', i), t)
      const total = day.reduce((s, m) => s + m.macros.protein, 0)
      const kcal = day.reduce((s, m) => s + m.macros.kcal, 0)
      // đủ protein (dư một chút không sao), calo sát mục tiêu
      expect(total / t.protein).toBeGreaterThan(0.9)
      expect(total / t.protein).toBeLessThan(1.35)
      expect(Math.abs(kcal - t.kcal) / t.kcal).toBeLessThan(0.1)
    }
  })

  it('kế hoạch ngày cố định theo ngày và gần calo mục tiêu', () => {
    const t = computeTargets(profile)
    const a = planDay('2026-11-26', t)
    const b = planDay('2026-11-26', t)
    expect(a.map((m) => m.template.id)).toEqual(b.map((m) => m.template.id))
    const total = a.reduce((s, m) => s + m.macros.kcal, 0)
    expect(Math.abs(total - t.kcal) / t.kcal).toBeLessThan(0.12)
  })
})

describe('date', () => {
  it('startOfWeek trả về thứ Hai', () => {
    expect(startOfWeek('2026-11-26')).toBe('2026-11-23')
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23')
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
  })
})
