import type { ExerciseDef, ExerciseLog, Outcome, PlanExercise, ProgressState } from '../types'

/** Số buổi liên tiếp không đạt rep tối thiểu trước khi giảm tạ */
export const STALL_LIMIT = 3
export const DELOAD_FACTOR = 0.9

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function currentWeight(ex: ExerciseDef, progress: Record<string, ProgressState>): number {
  return progress[ex.id]?.weight ?? ex.startWeight
}

export function newExerciseLog(plan: PlanExercise, weight: number): ExerciseLog {
  return {
    exerciseId: plan.exerciseId,
    weight,
    repsMin: plan.repsMin,
    repsMax: plan.repsMax,
    restSec: plan.restSec,
    sets: Array.from({ length: plan.sets }, () => ({ reps: plan.repsMax, done: false })),
  }
}

/**
 * Double progression:
 *  - Mọi set hoàn thành và đạt rep tối đa  → tăng tạ (up)
 *  - Có set chưa xong hoặc dưới rep tối thiểu → không đạt (stall); 3 lần liên tiếp → giảm 10% (deload)
 *  - Còn lại (trong khoảng rep) → giữ tạ, cố thêm rep (hold)
 */
export function evaluate(log: ExerciseLog): 'success' | 'hold' | 'fail' {
  const allDone = log.sets.every((s) => s.done)
  if (allDone && log.sets.every((s) => s.reps >= log.repsMax)) return 'success'
  if (!allDone || log.sets.some((s) => s.reps < log.repsMin)) return 'fail'
  return 'hold'
}

export function nextProgress(log: ExerciseLog, ex: ExerciseDef, prev?: ProgressState): { state: ProgressState; outcome: Outcome } {
  const result = evaluate(log)
  const base = log.weight
  if (result === 'success') {
    return { state: { weight: base + ex.increment, stalls: 0 }, outcome: 'up' }
  }
  if (result === 'hold') {
    return { state: { weight: base, stalls: 0 }, outcome: 'hold' }
  }
  const stalls = (prev?.stalls ?? 0) + 1
  if (stalls >= STALL_LIMIT) {
    const step = Math.min(ex.increment, 2.5)
    return { state: { weight: Math.max(0, roundTo(base * DELOAD_FACTOR, step)), stalls: 0 }, outcome: 'deload' }
  }
  return { state: { weight: base, stalls }, outcome: 'stall' }
}

/** Ước tính 1RM theo công thức Epley */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function logVolume(log: ExerciseLog): number {
  return log.sets.filter((s) => s.done).reduce((sum, s) => sum + s.reps * log.weight, 0)
}
