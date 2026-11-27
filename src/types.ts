export type Sex = 'male' | 'female'
export type Goal = 'cut' | 'maintain' | 'bulk'

export interface Profile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  /** Activity multiplier for TDEE (1.2 – 1.9) */
  activity: number
  goal: Goal
}

export interface ExerciseDef {
  id: string
  name: string
  nameEn: string
  muscle: string
  /** kg added when every set hits the top of the rep range */
  increment: number
  startWeight: number
  /** bài tạ cơ thể: weight = tạ đeo thêm */
  bodyweight?: boolean
}

export interface PlanExercise {
  exerciseId: string
  sets: number
  repsMin: number
  repsMax: number
  restSec: number
}

export interface ProgramDay {
  id: string
  name: string
  focus: string
  exercises: PlanExercise[]
}

export interface Program {
  id: string
  name: string
  description: string
  days: ProgramDay[]
}

export interface SetLog {
  reps: number
  done: boolean
}

export interface ExerciseLog {
  exerciseId: string
  weight: number
  repsMin: number
  repsMax: number
  restSec: number
  sets: SetLog[]
}

export type Outcome = 'up' | 'hold' | 'stall' | 'deload'

export interface ProgressChange {
  exerciseId: string
  from: number
  to: number
  outcome: Outcome
}

export interface SessionLog {
  id: string
  date: string
  programId: string
  dayId: string
  dayName: string
  startedAt: number
  finishedAt: number
  exercises: ExerciseLog[]
  changes: ProgressChange[]
}

export interface Draft {
  programId: string
  dayId: string
  startedAt: number
  exercises: ExerciseLog[]
}

export interface ProgressState {
  weight: number
  /** consecutive sessions below the rep range minimum */
  stalls: number
}

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export interface Food {
  id: string
  name: string
  /** values per 100 g */
  kcal: number
  protein: number
  carbs: number
  fat: number
  unit?: { label: string; grams: number }
}

export interface MealTemplate {
  id: string
  slot: MealSlot
  name: string
  items: { foodId: string; grams: number; fixed?: boolean }[]
}

export interface MealDayState {
  overrides: Partial<Record<MealSlot, string>>
  eaten: Partial<Record<MealSlot, boolean>>
}

export interface FoodEntry {
  id: string
  name: string
  /** số phần (0.5, 1, 1.5…) */
  qty: number
  /** dinh dưỡng cho 1 phần */
  kcal: number
  protein: number
  carbs: number
  fat: number
  time: number
}

export interface BodyWeight {
  date: string
  kg: number
}

export interface AppState {
  version: 1
  profile: Profile
  programId: string
  progress: Record<string, ProgressState>
  logs: SessionLog[]
  draft: Draft | null
  meals: Record<string, MealDayState>
  foodLog: Record<string, FoodEntry[]>
  bodyWeights: BodyWeight[]
}
