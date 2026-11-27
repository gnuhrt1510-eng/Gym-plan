import type { ExerciseDef, PlanExercise, Program } from '../types'

export const EXERCISES: ExerciseDef[] = [
  { id: 'squat', name: 'Gánh đùi', nameEn: 'Back Squat', muscle: 'Đùi trước, mông', increment: 5, startWeight: 40 },
  { id: 'deadlift', name: 'Deadlift', nameEn: 'Deadlift', muscle: 'Lưng dưới, đùi sau', increment: 5, startWeight: 60 },
  { id: 'rdl', name: 'Romanian Deadlift', nameEn: 'Romanian Deadlift', muscle: 'Đùi sau, mông', increment: 5, startWeight: 40 },
  { id: 'legpress', name: 'Đạp đùi máy', nameEn: 'Leg Press', muscle: 'Đùi trước', increment: 10, startWeight: 80 },
  { id: 'lunge', name: 'Chùng chân tạ đơn', nameEn: 'Dumbbell Lunge', muscle: 'Đùi, mông', increment: 2, startWeight: 10 },
  { id: 'legext', name: 'Đá đùi', nameEn: 'Leg Extension', muscle: 'Đùi trước', increment: 5, startWeight: 30 },
  { id: 'legcurl', name: 'Móc đùi sau máy', nameEn: 'Leg Curl', muscle: 'Đùi sau', increment: 2.5, startWeight: 25 },
  { id: 'calf', name: 'Bắp chuối (nhón gót)', nameEn: 'Calf Raise', muscle: 'Bắp chân', increment: 5, startWeight: 40 },
  { id: 'hipthrust', name: 'Đẩy hông', nameEn: 'Hip Thrust', muscle: 'Mông', increment: 5, startWeight: 40 },
  { id: 'bench', name: 'Đẩy ngực ngang', nameEn: 'Bench Press', muscle: 'Ngực, tay sau', increment: 2.5, startWeight: 40 },
  { id: 'incline_db', name: 'Đẩy ngực dốc tạ đơn', nameEn: 'Incline DB Press', muscle: 'Ngực trên', increment: 2, startWeight: 14 },
  { id: 'machine_incline', name: 'Đẩy máy ngực trên', nameEn: 'Incline Machine Press', muscle: 'Ngực trên', increment: 5, startWeight: 30 },
  { id: 'db_ohp', name: 'Đẩy vai trước tạ đơn', nameEn: 'Seated DB Shoulder Press', muscle: 'Vai trước', increment: 2, startWeight: 12 },
  { id: 'machine_ohp', name: 'Đẩy vai máy', nameEn: 'Machine Shoulder Press', muscle: 'Vai trước', increment: 5, startWeight: 25 },
  { id: 'reardelt', name: 'Vai sau máy pec deck', nameEn: 'Reverse Pec Deck', muscle: 'Vai sau', increment: 2.5, startWeight: 15 },
  { id: 'abs', name: 'Gập bụng cáp', nameEn: 'Cable Crunch', muscle: 'Bụng', increment: 2.5, startWeight: 20 },
  { id: 'ohp', name: 'Đẩy vai tạ đòn', nameEn: 'Overhead Press', muscle: 'Vai', increment: 2.5, startWeight: 25 },
  { id: 'lateral', name: 'Dang tay vai', nameEn: 'Lateral Raise', muscle: 'Vai giữa', increment: 1, startWeight: 6 },
  { id: 'fly', name: 'Ép ngực cáp / Pec deck', nameEn: 'Cable Fly / Pec Deck', muscle: 'Ngực', increment: 2.5, startWeight: 10 },
  { id: 'pushdown', name: 'Kéo cáp tay sau', nameEn: 'Triceps Pushdown', muscle: 'Tay sau', increment: 2.5, startWeight: 15 },
  { id: 'pullup', name: 'Kéo xà', nameEn: 'Pull-up', muscle: 'Lưng xô', increment: 2.5, startWeight: 0, bodyweight: true },
  { id: 'straightarm', name: 'Ép xô tay thẳng (cáp)', nameEn: 'Straight-arm Pulldown', muscle: 'Lưng xô', increment: 2.5, startWeight: 15 },
  { id: 'row', name: 'Chèo tạ đòn', nameEn: 'Barbell Row', muscle: 'Lưng giữa', increment: 2.5, startWeight: 40 },
  { id: 'pulldown', name: 'Kéo xô cáp', nameEn: 'Lat Pulldown', muscle: 'Lưng xô', increment: 2.5, startWeight: 35 },
  { id: 'cablerow', name: 'Kéo lưng ngang (cáp ngồi)', nameEn: 'Seated Cable Row', muscle: 'Lưng giữa', increment: 2.5, startWeight: 35 },
  { id: 'facepull', name: 'Face pull', nameEn: 'Face Pull', muscle: 'Vai sau', increment: 2.5, startWeight: 15 },
  { id: 'curl', name: 'Cuốn tay trước', nameEn: 'Biceps Curl', muscle: 'Tay trước', increment: 1, startWeight: 8 },
  { id: 'wristcurl', name: 'Cuốn cẳng tay', nameEn: 'Wrist Curl', muscle: 'Cẳng tay', increment: 1, startWeight: 10 },
  { id: 'hammer', name: 'Cuốn búa', nameEn: 'Hammer Curl', muscle: 'Tay trước, cẳng tay', increment: 1, startWeight: 8 },
]

export const EXERCISE_MAP: Record<string, ExerciseDef> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

const ex = (exerciseId: string, sets: number, repsMin: number, repsMax: number, restSec = 90): PlanExercise => ({
  exerciseId,
  sets,
  repsMin,
  repsMax,
  restSec,
})

export const PROGRAMS: Program[] = [
  {
    id: 'my4',
    name: 'Ngực • Lưng • Chân • Vai',
    description: '4 buổi/tuần (VD: T2 – T3 – T5 – T6), mỗi buổi một nhóm cơ chính.',
    days: [
      {
        id: 'my4-chest',
        name: 'Buổi 1: Ngực',
        focus: 'Ngực giữa • Ngực trên • Tay sau',
        exercises: [ex('bench', 4, 6, 10, 150), ex('machine_incline', 3, 8, 12, 90), ex('fly', 3, 12, 15, 60), ex('pushdown', 3, 10, 15, 60)],
      },
      {
        id: 'my4-back',
        name: 'Buổi 2: Lưng',
        focus: 'Lưng xô • Lưng giữa • Tay trước • Cẳng tay',
        exercises: [
          ex('pullup', 3, 6, 10, 120),
          ex('pulldown', 3, 8, 12, 90),
          ex('cablerow', 3, 8, 12, 90),
          ex('straightarm', 3, 12, 15, 60),
          ex('curl', 3, 10, 12, 60),
          ex('wristcurl', 2, 12, 15, 60),
        ],
      },
      {
        id: 'my4-legs',
        name: 'Buổi 3: Chân',
        focus: 'Đùi trước • Đùi sau • Bắp chuối',
        exercises: [ex('legext', 3, 12, 15, 60), ex('legpress', 4, 8, 12, 120), ex('legcurl', 3, 10, 15, 60), ex('calf', 4, 12, 15, 60)],
      },
      {
        id: 'my4-shoulders',
        name: 'Buổi 4: Vai',
        focus: 'Vai trước • Vai giữa • Vai sau • Bụng',
        exercises: [
          ex('db_ohp', 3, 8, 12, 90),
          ex('machine_ohp', 3, 8, 12, 90),
          ex('lateral', 4, 12, 15, 60),
          ex('reardelt', 3, 12, 15, 60),
          ex('abs', 3, 12, 15, 60),
        ],
      },
    ],
  },
  {
    id: 'fullbody3',
    name: 'Full Body 3 buổi',
    description: 'Cho người mới: 3 buổi/tuần (VD: T2 – T4 – T6), mỗi buổi tập toàn thân.',
    days: [
      {
        id: 'fb-a',
        name: 'Buổi A',
        focus: 'Squat • Bench • Row',
        exercises: [ex('squat', 3, 5, 8, 150), ex('bench', 3, 5, 8, 150), ex('row', 3, 6, 10, 120), ex('lateral', 2, 12, 15, 60), ex('curl', 2, 10, 12, 60)],
      },
      {
        id: 'fb-b',
        name: 'Buổi B',
        focus: 'Deadlift • OHP • Pulldown',
        exercises: [ex('deadlift', 3, 4, 6, 180), ex('ohp', 3, 5, 8, 120), ex('pulldown', 3, 8, 12, 90), ex('lunge', 2, 8, 12, 90), ex('pushdown', 2, 10, 15, 60)],
      },
      {
        id: 'fb-c',
        name: 'Buổi C',
        focus: 'Squat • Incline • Cable row',
        exercises: [ex('squat', 3, 6, 10, 150), ex('incline_db', 3, 8, 12, 90), ex('cablerow', 3, 8, 12, 90), ex('legcurl', 2, 10, 15, 60), ex('facepull', 2, 12, 15, 60)],
      },
    ],
  },
  {
    id: 'upperlower4',
    name: 'Upper / Lower 4 buổi',
    description: 'Trung cấp: 4 buổi/tuần, xen kẽ thân trên và thân dưới.',
    days: [
      {
        id: 'ul-u1',
        name: 'Thân trên 1',
        focus: 'Sức mạnh',
        exercises: [ex('bench', 4, 5, 8, 150), ex('row', 4, 6, 10, 120), ex('ohp', 3, 6, 10, 120), ex('pulldown', 3, 8, 12, 90), ex('curl', 2, 10, 12, 60), ex('pushdown', 2, 10, 12, 60)],
      },
      {
        id: 'ul-l1',
        name: 'Thân dưới 1',
        focus: 'Sức mạnh',
        exercises: [ex('squat', 4, 5, 8, 180), ex('rdl', 3, 6, 10, 120), ex('legpress', 3, 10, 12, 90), ex('legcurl', 3, 10, 15, 60), ex('calf', 3, 10, 15, 60)],
      },
      {
        id: 'ul-u2',
        name: 'Thân trên 2',
        focus: 'Thể tích',
        exercises: [ex('incline_db', 4, 8, 12, 90), ex('cablerow', 4, 8, 12, 90), ex('lateral', 3, 12, 15, 60), ex('fly', 3, 12, 15, 60), ex('facepull', 3, 12, 15, 60), ex('hammer', 3, 10, 12, 60)],
      },
      {
        id: 'ul-l2',
        name: 'Thân dưới 2',
        focus: 'Thể tích',
        exercises: [ex('deadlift', 3, 4, 6, 180), ex('hipthrust', 3, 8, 12, 90), ex('lunge', 3, 10, 12, 90), ex('legcurl', 3, 12, 15, 60), ex('calf', 3, 12, 15, 60)],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Nâng cao: 3 hoặc 6 buổi/tuần (lặp lại vòng Push → Pull → Legs).',
    days: [
      {
        id: 'ppl-push',
        name: 'Push',
        focus: 'Ngực • Vai • Tay sau',
        exercises: [ex('bench', 4, 5, 8, 150), ex('ohp', 3, 6, 10, 120), ex('incline_db', 3, 8, 12, 90), ex('lateral', 3, 12, 15, 60), ex('fly', 3, 12, 15, 60), ex('pushdown', 3, 10, 15, 60)],
      },
      {
        id: 'ppl-pull',
        name: 'Pull',
        focus: 'Lưng • Vai sau • Tay trước',
        exercises: [ex('deadlift', 3, 4, 6, 180), ex('pulldown', 4, 8, 12, 90), ex('cablerow', 3, 8, 12, 90), ex('facepull', 3, 12, 15, 60), ex('curl', 3, 10, 12, 60), ex('hammer', 2, 10, 12, 60)],
      },
      {
        id: 'ppl-legs',
        name: 'Legs',
        focus: 'Đùi • Mông • Bắp chân',
        exercises: [ex('squat', 4, 5, 8, 180), ex('rdl', 3, 6, 10, 120), ex('legpress', 3, 10, 12, 90), ex('legcurl', 3, 10, 15, 60), ex('calf', 4, 10, 15, 60)],
      },
    ],
  },
]

export const PROGRAM_MAP: Record<string, Program> = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]))
