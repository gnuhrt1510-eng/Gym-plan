export type MuscleId =
  | 'chest'
  | 'frontDelt'
  | 'sideDelt'
  | 'rearDelt'
  | 'traps'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'abs'
  | 'obliques'
  | 'lats'
  | 'midBack'
  | 'lowerBack'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'

export interface MuscleTargets {
  primary: MuscleId[]
  secondary: MuscleId[]
}

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: 'Ngực',
  frontDelt: 'Vai trước',
  sideDelt: 'Vai giữa',
  rearDelt: 'Vai sau',
  traps: 'Cầu vai',
  biceps: 'Tay trước',
  triceps: 'Tay sau',
  forearm: 'Cẳng tay',
  abs: 'Bụng',
  obliques: 'Liên sườn',
  lats: 'Xô',
  midBack: 'Lưng giữa',
  lowerBack: 'Lưng dưới',
  glutes: 'Mông',
  quads: 'Đùi trước',
  hamstrings: 'Đùi sau',
  calves: 'Bắp chuối',
}

const t = (primary: MuscleId[], secondary: MuscleId[] = []): MuscleTargets => ({ primary, secondary })

/** Cơ chính / cơ phụ của từng bài */
export const EXERCISE_MUSCLES: Record<string, MuscleTargets> = {
  bench: t(['chest'], ['frontDelt', 'triceps']),
  machine_incline: t(['chest', 'frontDelt'], ['triceps']),
  incline_db: t(['chest', 'frontDelt'], ['triceps']),
  fly: t(['chest'], ['frontDelt']),
  pushdown: t(['triceps']),
  pullup: t(['lats'], ['biceps', 'midBack', 'rearDelt', 'forearm']),
  pulldown: t(['lats'], ['biceps', 'midBack']),
  cablerow: t(['midBack', 'lats'], ['biceps', 'rearDelt', 'traps']),
  row: t(['midBack', 'lats'], ['biceps', 'rearDelt', 'lowerBack']),
  straightarm: t(['lats'], ['triceps']),
  curl: t(['biceps'], ['forearm']),
  hammer: t(['biceps', 'forearm']),
  wristcurl: t(['forearm']),
  legext: t(['quads']),
  legpress: t(['quads', 'glutes'], ['hamstrings']),
  legcurl: t(['hamstrings'], ['calves']),
  calf: t(['calves']),
  squat: t(['quads', 'glutes'], ['hamstrings', 'lowerBack', 'abs']),
  deadlift: t(['hamstrings', 'glutes', 'lowerBack'], ['traps', 'lats', 'forearm', 'quads']),
  rdl: t(['hamstrings', 'glutes'], ['lowerBack']),
  lunge: t(['quads', 'glutes'], ['hamstrings']),
  hipthrust: t(['glutes'], ['hamstrings']),
  db_ohp: t(['frontDelt'], ['sideDelt', 'triceps', 'traps']),
  machine_ohp: t(['frontDelt'], ['sideDelt', 'triceps']),
  ohp: t(['frontDelt'], ['sideDelt', 'triceps', 'traps']),
  lateral: t(['sideDelt'], ['traps']),
  reardelt: t(['rearDelt'], ['midBack', 'traps']),
  facepull: t(['rearDelt'], ['midBack', 'traps']),
  abs: t(['abs'], ['obliques']),
}

/** Nhóm cơ (dùng ở thẻ "set tuần này") → vùng tô trên hình */
export const GROUP_MUSCLES: Record<string, MuscleId[]> = {
  Ngực: ['chest'],
  Lưng: ['lats', 'midBack'],
  Vai: ['frontDelt', 'sideDelt', 'rearDelt'],
  'Tay trước': ['biceps'],
  'Tay sau': ['triceps'],
  'Cẳng tay': ['forearm'],
  'Đùi trước': ['quads'],
  'Đùi sau': ['hamstrings'],
  Mông: ['glutes'],
  'Bắp chuối': ['calves'],
  Bụng: ['abs', 'obliques'],
}

export const FRONT: MuscleId[] = ['chest', 'frontDelt', 'sideDelt', 'traps', 'biceps', 'forearm', 'abs', 'obliques', 'quads', 'calves']
export const BACK: MuscleId[] = ['traps', 'rearDelt', 'sideDelt', 'midBack', 'lats', 'lowerBack', 'triceps', 'forearm', 'glutes', 'hamstrings', 'calves']

/** Mặt nào thể hiện bài tập rõ hơn (nhiều cơ chính hơn) */
export function bestView(m: MuscleTargets): 'front' | 'back' {
  const score = (side: MuscleId[]) => m.primary.filter((x) => side.includes(x)).length * 3 + m.secondary.filter((x) => side.includes(x)).length
  return score(BACK) > score(FRONT) ? 'back' : 'front'
}
