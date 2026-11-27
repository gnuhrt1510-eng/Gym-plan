import { describe, expect, it } from 'vitest'
import { EXERCISE_MAP } from '../data/programs'
import { MEAL_TEMPLATES, SLOT_SHARE } from '../data/foods'
import { computeTargets, planDay, scaleMeal } from './nutrition'
import { estimate1RM, nextProgress, newExerciseLog } from './progression'
import { addDays, startOfWeek } from './date'
import { searchDishes, suggestFillers, totalMacros, verdict } from './foodlog'

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

describe('food log', () => {
  it('tìm món không dấu', () => {
    expect(searchDishes('pho')[0].name).toMatch(/^Phở/)
    expect(searchDishes('com ga').map((d) => d.id)).toContain('com-ga')
    expect(searchDishes('trung')[0].id).toBe('trung')
    expect(searchDishes('xyz')).toEqual([])
  })

  it('tổng calo theo số phần và nhận xét đủ/thiếu', () => {
    const e = (kcal: number, qty: number) => ({ id: 'x', name: 'x', qty, kcal, protein: 10, carbs: 0, fat: 0, time: 0 })
    const total = totalMacros([e(450, 1), e(72, 3)])
    expect(total.kcal).toBe(666)
    expect(total.protein).toBe(40)
    expect(verdict(1800, 2500)).toEqual({ status: 'short', diff: 700 })
    expect(verdict(2450, 2500).status).toBe('ok')
    expect(verdict(2900, 2500)).toEqual({ status: 'over', diff: 400 })
  })

  it('gợi ý món bù không vượt quá nhiều phần còn thiếu', () => {
    for (const d of suggestFillers(300, 40)) expect(d.kcal).toBeLessThanOrEqual(400)
  })
})

describe('plan overview', () => {
  it('xếp 4 buổi vào T2, T3, T5, T6 và đếm set theo nhóm cơ', async () => {
    const { weekSchedule, setsPerGroup } = await import('../components/PlanOverview')
    const { PROGRAM_MAP } = await import('../data/programs')
    const sched = weekSchedule(PROGRAM_MAP.my4, [0, 1, 3, 4])
    expect(sched.map((d) => d?.id ?? null)).toEqual(['my4-chest', 'my4-back', null, 'my4-legs', 'my4-shoulders', null, null])
    // Buổi ngực không có bài vai
    expect(PROGRAM_MAP.my4.days[0].exercises.some((e) => e.exerciseId === 'ohp' || e.exerciseId === 'lateral')).toBe(false)
    const vol = Object.fromEntries(setsPerGroup(sched).map((v) => [v.group, v.sets]))
    expect(vol['Ngực']).toBe(10)
    expect(vol['Vai']).toBe(13)
  })
})

describe('muscle map data', () => {
  it('mọi bài tập đều có cơ chính và mặt hình phù hợp', async () => {
    const { EXERCISES } = await import('../data/programs')
    const { EXERCISE_MUSCLES, bestView } = await import('../data/muscles')
    for (const ex of EXERCISES) {
      expect(EXERCISE_MUSCLES[ex.id]?.primary.length, ex.id).toBeGreaterThan(0)
    }
    expect(bestView(EXERCISE_MUSCLES.bench)).toBe('front')
    expect(bestView(EXERCISE_MUSCLES.pulldown)).toBe('back')
    expect(bestView(EXERCISE_MUSCLES.legcurl)).toBe('back')
  })
})

describe('cloud chunks', () => {
  it('chia rồi ghép lại không mất dữ liệu', async () => {
    const { DEFAULT_STATE, appToChunks, appFromChunks, isPristine } = await import('./store')
    const s = {
      ...DEFAULT_STATE,
      profile: { ...DEFAULT_STATE.profile, heightCm: 178, weightKg: 72 },
      logs: [
        { id: 'a', date: '2026-10-30', programId: 'my4', dayId: 'my4-chest', dayName: 'x', startedAt: 1, finishedAt: 2, exercises: [], changes: [] },
        { id: 'b', date: '2026-11-02', programId: 'my4', dayId: 'my4-back', dayName: 'y', startedAt: 3, finishedAt: 4, exercises: [], changes: [] },
      ],
      foodLog: { '2026-11-02': [{ id: 'f', name: 'Phở', qty: 1, kcal: 450, protein: 25, carbs: 55, fat: 12, time: 5 }] },
    }
    const chunks = appToChunks(s)
    expect(Object.keys(chunks).sort()).toEqual(['core', 'food-2026-11', 'logs-2026-10', 'logs-2026-11'])
    expect(JSON.parse(JSON.stringify(appFromChunks(JSON.parse(JSON.stringify(chunks)))))).toEqual(JSON.parse(JSON.stringify(s)))
    expect(isPristine(DEFAULT_STATE)).toBe(true)
    expect(isPristine(s)).toBe(false)
  })
})

describe('activity calendar', () => {
  it('mức độ ngày và chuỗi tuần đạt mục tiêu', async () => {
    const { buildDays, dayLevel, weekStreak } = await import('../components/ActivityCalendar')
    const log = (date: string, sets: number) => ({
      id: date, date, programId: 'my4', dayId: 'x', dayName: 'x', startedAt: 0, finishedAt: 0, changes: [],
      exercises: [{ exerciseId: 'bench', weight: 40, repsMin: 6, repsMax: 10, restSec: 90, sets: Array.from({ length: sets }, () => ({ reps: 8, done: true })) }],
    })
    // tuần 16–22/11 và 23–29/11/2026 (T2 = 16, 23)
    const logs = ['2026-11-16', '2026-11-17', '2026-11-19', '2026-11-20', '2026-11-23', '2026-11-24'].map((d) => log(d, 16))
    const run = { id: 'r', title: 'r', startedAt: new Date(2026, 10, 24, 6).getTime(), durationMs: 1, distanceM: 3000, steps: 0, stepsEstimated: true, kcal: 0, points: [], source: 'gps' as const }
    const days = buildDays(logs, [run])
    expect(dayLevel(days.get('2026-11-16'))).toBe(2)
    expect(dayLevel(days.get('2026-11-24'))).toBe(3)
    expect(dayLevel(days.get('2026-11-18'))).toBe(0)
    expect(weekStreak(days, 4, '2026-11-25')).toBe(1) // tuần trước đạt 4, tuần này mới 2
  })
})

describe('ước tính calo từ mô tả', () => {
  it('2 bát cơm với 150g thịt bò xào rau cần', async () => {
    const { estimateLocal, sumItems } = await import('./estimate')
    const e = estimateLocal('2 bát cơm với 150g thịt bò xào rau cần')
    const names = e.items.map((i) => i.name)
    expect(names).toEqual(['Cơm trắng', 'Thịt bò', 'Dầu ăn (xào/chiên)', 'Rau'])
    const t = sumItems(e.items)
    expect(t.kcal).toBeGreaterThan(700)
    expect(t.kcal).toBeLessThan(900)
    expect(Math.round(t.protein)).toBeGreaterThanOrEqual(45)
    expect(e.unknown).toEqual([])
  })

  it('không dấu, nhiều món, số bằng chữ', async () => {
    const { estimateLocal } = await import('./estimate')
    const e = estimateLocal('pho bo, hai qua trung luoc + 1 ly tra sua')
    expect(e.items.map((i) => i.name)).toEqual(['Phở bò', 'Trứng gà', 'Trà sữa trân châu'])
    expect(e.items[1].kcal).toBeCloseTo(144, 0)
  })

  it('báo phần không nhận ra', async () => {
    const { estimateLocal } = await import('./estimate')
    expect(estimateLocal('sầu riêng').unknown).toEqual(['sau rieng'])
  })
})
