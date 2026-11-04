import { weekday, diffDays } from './day'
import { penaltyQuest, type PenaltyInput } from './penalties'
import { RECOVERY_LOAD_FACTOR, LOW_MOOD_LOAD_FACTOR, DELOAD_LOAD_FACTOR } from './vitals'
import { isObjectiveDone } from './xp'
import { classifyDay } from './penalties'
import type {
  DayOutcome,
  ExamInfo,
  LockedTeaser,
  Mode,
  ObjectiveProgress,
  ObjectiveSpec,
  ProgressMap,
  QuestSpec,
} from './types'

export const DAILY_CAP_MIN = 240

/** Awakening Ramp columns (spec 4.3). Index 0 = week 1. */
export const RAMP: Record<string, readonly [number, number, number, number]> = {
  AWAKEN: [5, 5, 5, 5],
  BODY: [40, 50, 55, 60],
  STILLNESS: [3, 5, 8, 10],
  MAIN_QUEST: [25, 40, 50, 60],
  SKILL_GATE: [20, 30, 35, 40],
  LIBRARY: [10, 15, 20, 20],
  STRATEGY: [5, 10, 10, 10],
  COURAGE: [5, 10, 10, 10],
  TEACH_BACK: [2, 3, 5, 5],
  SHUTDOWN: [10, 15, 20, 20],
}

export const RAMP_TOTALS = [125, 183, 218, 240] as const

export interface TrioTargets {
  push: number
  squat: number
  sit: number
  steps: number
}

export interface QuestInput {
  mode: Mode
  dayKey: string
  gymDays: number[]
  /** Awakening Ramp column 1-4 (BREAK). SEMESTER uses the full column. */
  rampWeek: number
  recovery?: boolean // Recovery Mode: 3 days at 50 % load
  deload?: boolean
  lowMood?: boolean
  hpRecovery?: boolean // HP < 40 % this morning
  /** Pain flag: Body becomes a mobility swap for 3 days (spec 4.5). */
  painSwap?: boolean
  penalty?: PenaltyInput | null // a Penalty Quest is issued today
  exams?: readonly ExamInfo[]
  /** EXAM mode: planned study minutes for the day (Dungeons). */
  studyTargetMin?: number
  trio?: TrioTargets
  mainQuestWindow?: string
}

const BODY_STATS = ['STR', 'VIT'] as const

function obj(partial: Omit<ObjectiveSpec, 'key'> & { key?: string }): ObjectiveSpec {
  return { key: partial.key ?? partial.id, ...partial }
}

function awaken(): ObjectiveSpec {
  return obj({
    id: 'AWAKEN',
    title: 'AWAKEN',
    desc: 'Up at wake time. No phone for the first 30 minutes.',
    minutes: 5,
    stats: ['WIL', 'VIT'],
    window: 'On waking',
    kind: 'checklist',
    items: [
      { id: 'up', label: 'Up at wake time, no snooze' },
      { id: 'bed', label: 'Bed made' },
      { id: 'water', label: '500 ml water' },
      { id: 'phone', label: 'No phone for 30 min' },
    ],
  })
}

function shutdown(minutes: number, full: boolean): ObjectiveSpec {
  const items = full
    ? [
        { id: 'pulses', label: '3 Pulses done' },
        { id: 'journal', label: '3-line Night Journal' },
        { id: 'drift', label: 'Drift review' },
        { id: 'reset', label: '5-min reset (desk, bag, clothes)' },
        { id: 'plan', label: "Tomorrow's top 3 planned" },
        { id: 'lights', label: 'Lights out on time' },
      ]
    : [
        { id: 'pulses', label: '3 Pulses done' },
        { id: 'journal', label: '3-line Night Journal' },
        { id: 'next', label: "Tomorrow's first study block named" },
        { id: 'lights', label: 'Lights out on time' },
      ]
  return obj({
    id: 'SHUTDOWN',
    title: full ? 'MIRROR & SHUTDOWN' : 'SHUTDOWN',
    desc: 'Close the day. The engine needs rest.',
    minutes,
    stats: ['WIS', 'ORD', 'VIT'],
    window: 'Last 30 min before lights-out',
    kind: 'checklist',
    items,
  })
}

function bodyMobility(pain = false): ObjectiveSpec {
  return obj({
    id: 'BODY',
    title: pain ? 'BODY: Mobility swap' : 'BODY: Recovery Protocol',
    desc: pain ? 'Pain flagged. Mobility and a walk for a few days — progress resumes when it settles.' : 'HP is low. Mobility and a walk today — this still counts as kept.',
    minutes: 25,
    stats: [...BODY_STATS],
    window: 'Morning',
    kind: 'checklist',
    items: [
      { id: 'mobility', label: '10 min mobility' },
      { id: 'walk', label: '15 min easy walk' },
    ],
  })
}

function activeRecovery(): ObjectiveSpec {
  return obj({
    id: 'RECOVERY',
    title: 'ACTIVE RECOVERY',
    desc: 'Rest day for the body. 30-minute walk or mobility.',
    minutes: 30,
    stats: [...BODY_STATS],
    window: 'Any',
    kind: 'timer',
    target: 30,
    unit: 'min',
  })
}

function examBody(gym: boolean): ObjectiveSpec {
  if (gym) {
    return obj({
      id: 'BODY',
      title: 'BODY: Gym day',
      desc: 'Session done and logged.',
      minutes: 45,
      stats: [...BODY_STATS],
      window: 'Any',
      kind: 'checklist',
      items: [
        { id: 'session', label: 'Gym session done' },
        { id: 'logged', label: 'Session logged' },
      ],
    })
  }
  return obj({
    id: 'BODY',
    title: 'BODY: Daily Trio + walk',
    desc: '10 push-ups, 10 squats, 10 sit-ups and a 15-minute walk.',
    minutes: 25,
    stats: [...BODY_STATS],
    window: 'Any',
    kind: 'checklist',
    items: [
      { id: 'push', label: '10 push-ups' },
      { id: 'squat', label: '10 squats' },
      { id: 'sit', label: '10 sit-ups' },
      { id: 'walk', label: '15-min walk' },
    ],
  })
}

function ritualFor(exam: ExamInfo, when: 'eve' | 'morning'): ObjectiveSpec {
  return obj({
    id: 'RITUAL',
    key: `RITUAL:${exam.id}`,
    title: `PRE-BOSS RITUAL: ${exam.subject}`,
    desc:
      when === 'eve'
        ? `Boss Raid tomorrow. Log your fear: "I'm afraid that…", odds %, an if-then plan.`
        : `Boss Raid today. Log your fear: "I'm afraid that…", odds %, an if-then plan.`,
    minutes: 8,
    stats: ['NRV', 'WIS'],
    window: when === 'eve' ? 'Night before' : 'Morning of',
    kind: 'checklist',
    items: [{ id: 'fear', label: 'Fear Log entry written (with if-then plan)' }],
    ref: exam.id,
  })
}

const EXAM_LOCKS: LockedTeaser[] = [
  { id: 'COURAGE', title: 'COURAGE', reason: 'LOCKED — after the final boss' },
  { id: 'STRATEGY', title: 'STRATEGY', reason: 'LOCKED — after the final boss' },
  { id: 'SKILL_GATE', title: 'SKILL GATE', reason: 'LOCKED — after the final boss' },
  { id: 'MAIN_QUEST', title: 'MAIN QUEST', reason: 'LOCKED — after the final boss' },
]

function scale(spec: ObjectiveSpec, factor: number): ObjectiveSpec {
  if (factor >= 1) return spec
  const minutes = Math.max(1, Math.round(spec.minutes * factor))
  if (spec.kind === 'checklist') return { ...spec, minutes }
  return { ...spec, minutes, target: Math.max(1, Math.round((spec.target ?? spec.minutes) * factor)) }
}

function timer(id: ObjectiveSpec['id'], title: string, desc: string, minutes: number, stats: ObjectiveSpec['stats'], window: string, dungeon = false): ObjectiveSpec {
  return obj({ id, title, desc, minutes, stats, window, kind: 'timer', target: minutes, unit: 'min', dungeon })
}

function trioBody(t: TrioTargets, minutes: number): ObjectiveSpec {
  return obj({
    id: 'BODY',
    title: 'BODY: Daily Trio + walk',
    desc: 'The quest that looks pointless and compounds.',
    minutes,
    stats: [...BODY_STATS],
    window: 'Morning',
    kind: 'checklist',
    items: [
      { id: 'push', label: `${t.push} push-ups` },
      { id: 'squat', label: `${t.squat} squats` },
      { id: 'sit', label: `${t.sit} sit-ups` },
      { id: 'walk', label: `Walk to ${String(t.steps).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} steps` },
    ],
  })
}

function gymBody(minutes: number): ObjectiveSpec {
  return obj({
    id: 'BODY',
    title: 'BODY: Gym day',
    desc: 'Session done and logged. Long sessions still count as the budgeted time.',
    minutes,
    stats: [...BODY_STATS],
    window: 'Morning',
    kind: 'checklist',
    items: [
      { id: 'session', label: 'Gym session done' },
      { id: 'logged', label: 'Session logged' },
    ],
  })
}

function examQuest(i: QuestInput, gym: boolean, sunday: boolean, factor: number): { objectives: ObjectiveSpec[]; notices: string[] } {
  const notices: string[] = []
  const study = Math.max(15, Math.round((i.studyTargetMin ?? 120) * factor))
  const list: ObjectiveSpec[] = [awaken()]
  const body = i.hpRecovery || i.deload || i.painSwap ? bodyMobility(!!i.painSwap) : sunday ? activeRecovery() : examBody(gym)
  list.push(scale(body, factor))
  list.push(
    obj({
      id: 'DUNGEONS',
      title: 'EXAM DUNGEONS',
      desc: 'Log every study block (subject + minutes) with the phone in another room. SEED prompts run in the timer.',
      minutes: study,
      stats: ['INT', 'FOC', 'WIL'],
      window: 'Your study blocks',
      kind: 'timer',
      target: study,
      unit: 'min',
      dungeon: true,
    }),
  )
  list.push(
    obj({
      id: 'TEACH_BACK',
      title: 'TEACH-BACK',
      desc: "Explain one big idea from today's study out loud for 2 minutes.",
      minutes: 3,
      stats: ['INT', 'NRV'],
      window: 'Evening',
      kind: 'checklist',
      items: [{ id: 'explained', label: 'Explained one big idea aloud (2 min)' }],
    }),
  )
  list.push(
    obj({
      id: 'LIBRARY',
      title: 'LIBRARY',
      desc: '5 pages or 10 minutes of audio.',
      minutes: 10,
      stats: ['WIS'],
      window: 'Any',
      kind: 'checklist',
      items: [{ id: 'read', label: '5 pages or 10 min of audio' }],
    }),
  )
  list.push(shutdown(12, false))
  for (const e of i.exams ?? []) {
    const gap = diffDays(i.dayKey, e.dateKey)
    if (gap === 1) list.push(ritualFor(e, 'eve'))
    else if (gap === 0) list.push(ritualFor(e, 'morning'))
  }
  if (i.hpRecovery) notices.push('RECOVERY PROTOCOL: Body is mobility + a walk today. It still counts as kept.')
  if (i.deload && !i.hpRecovery) notices.push('DELOAD DAY: lighter day. Rest is part of the plan.')
  return { objectives: list, notices }
}

function fullQuest(i: QuestInput, mode: Mode, gym: boolean, sunday: boolean, factor: number): { objectives: ObjectiveSpec[]; notices: string[] } {
  const col = mode === 'SEMESTER' ? 3 : Math.max(0, Math.min(3, Math.round(i.rampWeek) - 1))
  const m = (k: keyof typeof RAMP) => RAMP[k][col]
  const notices: string[] = []
  const list: ObjectiveSpec[] = [awaken()]

  if (sunday) {
    list.push(activeRecovery())
    list.push(
      obj({
        id: 'LIBRARY',
        title: 'LIBRARY',
        desc: 'Read or listen.',
        minutes: m('LIBRARY'),
        stats: ['WIS', 'INT'],
        window: 'Any',
        kind: 'timer',
        target: m('LIBRARY'),
        unit: 'min',
      }),
    )
    list.push(
      obj({
        id: 'GUILD_REPORT',
        title: 'WEEKLY GUILD REPORT',
        desc: 'Review the week: stats, TRUST, drifts, Thought Audit.',
        minutes: 30,
        stats: ['ORD', 'WIS'],
        window: 'Evening',
        kind: 'checklist',
        items: [
          { id: 'read', label: 'Read the report' },
          { id: 'audit', label: 'Thought Audit ticked' },
          { id: 'backup', label: 'Backup downloaded' },
        ],
      }),
    )
    return { objectives: list.map((s) => scale(s, factor)), notices: ['SUNDAY — REST & REVIEW. Light day by design.'] }
  }

  const body = i.hpRecovery || i.deload || i.painSwap ? bodyMobility(!!i.painSwap) : gym ? gymBody(m('BODY')) : trioBody(i.trio ?? { push: 10, squat: 10, sit: 10, steps: 5000 }, m('BODY'))
  list.push(body)
  list.push(
    timer('STILLNESS', 'STILLNESS', 'Breath-counting meditation. Count 1 to 10, start again.', m('STILLNESS'), ['FOC', 'WIS'], 'Morning'),
  )

  const courseDay = mode === 'SEMESTER' && [1, 3, 5].includes(weekday(i.dayKey))
  if (courseDay) {
    list.push(
      timer('COURSEWORK', 'COURSEWORK DUNGEON', 'Subject-tagged study with SEED. Phone in another room.', m('MAIN_QUEST'), ['INT', 'FOC', 'WIL'], 'Peak focus window', true),
    )
  } else {
    list.push(
      timer('MAIN_QUEST', 'MAIN QUEST DUNGEON', 'Deep work on the Main Quest. Phone in another room.', m('MAIN_QUEST'), ['FOC', 'WIL', 'SEN', 'LCK'], i.mainQuestWindow ?? 'Peak focus 09:00–12:00', true),
    )
  }
  const skill = mode === 'SEMESTER' ? 20 : m('SKILL_GATE')
  const lib = mode === 'SEMESTER' ? 15 : m('LIBRARY')
  list.push(timer('SKILL_GATE', 'SKILL GATE', "Deliberate practice on this month's skill.", skill, ['INT'], 'Any'))
  list.push(
    timer('LIBRARY', 'LIBRARY', 'Read or listen. Drive time is training time.', lib, ['WIS', 'INT'], 'Any'),
  )
  list.push(timer('STRATEGY', 'STRATEGY', 'Chess puzzles on Lichess. Log count + rating.', m('STRATEGY'), ['SEN', 'INT'], 'Any'))
  list.push(
    obj({
      id: 'COURAGE',
      title: 'COURAGE',
      desc: "Today's Risk Quest. Rejection counts as a win.",
      minutes: m('COURAGE'),
      stats: ['NRV', 'LCK'],
      window: 'Daytime',
      kind: 'checklist',
      items: [{ id: 'done', label: 'Risk Quest attempted and logged' }],
    }),
  )
  list.push(
    obj({
      id: 'TEACH_BACK',
      title: 'TEACH-BACK',
      desc: "Explain today's most important idea aloud.",
      minutes: m('TEACH_BACK'),
      stats: ['INT', 'NRV'],
      window: 'Evening',
      kind: 'checklist',
      items: [{ id: 'explained', label: `Explained aloud (${m('TEACH_BACK')} min)` }],
    }),
  )
  list.push(shutdown(m('SHUTDOWN'), true))
  if (i.hpRecovery) notices.push('RECOVERY PROTOCOL: Body is mobility + a walk today. It still counts as kept.')
  if (i.deload && !i.hpRecovery) notices.push('DELOAD DAY: lighter body work today.')
  return { objectives: list.map((s) => scale(s, factor)), notices }
}

/** Generate the Daily Quest for one game day. Pure. */
export function generateDailyQuest(i: QuestInput): QuestSpec {
  const wd = weekday(i.dayKey)
  const sunday = wd === 0
  const gym = !sunday && i.gymDays.includes(wd)
  let factor = 1
  const notices: string[] = []
  if (i.recovery) {
    factor = Math.min(factor, RECOVERY_LOAD_FACTOR)
    notices.push('RECOVERY MODE: load reduced to 50 %. No penalties. Return.')
  }
  if (i.lowMood) factor = Math.min(factor, LOW_MOOD_LOAD_FACTOR)
  if (i.deload) factor = Math.min(factor, DELOAD_LOAD_FACTOR)

  const built = i.mode === 'EXAM' ? examQuest(i, gym, sunday, factor) : fullQuest(i, i.mode, gym, sunday, factor)
  notices.push(...built.notices)
  if (i.lowMood) notices.push('Load −25 % for a few days. This is care, not a penalty.')

  const penalty = i.penalty && !i.recovery ? penaltyQuest(i.penalty) : null
  const objectives = built.objectives
  let total = objectives.reduce((s, o) => s + o.minutes, 0)
  if (total > DAILY_CAP_MIN) {
    const f = DAILY_CAP_MIN / total
    for (let k = 0; k < objectives.length; k++) objectives[k] = scale(objectives[k], f)
    total = objectives.reduce((s, o) => s + o.minutes, 0)
  }
  return {
    dayKey: i.dayKey,
    mode: i.mode,
    weekday: wd,
    isGymDay: gym,
    isSunday: sunday,
    objectives,
    locked: i.mode === 'EXAM' ? EXAM_LOCKS : [],
    penalty,
    totalMinutes: total,
    loadFactor: factor,
    notices,
  }
}

// ---------------------------------------------------------------- scoring

export interface DayScore {
  kept: number
  total: number
  pct: number
  outcome: DayOutcome
  penaltyCleared: boolean | null
  keptKeys: string[]
}

export function scoreDay(quest: QuestSpec, progress: ProgressMap): DayScore {
  const keptKeys: string[] = []
  for (const o of quest.objectives) if (isObjectiveDone(o, progress[o.key])) keptKeys.push(o.key)
  const total = quest.objectives.length
  const pct = total ? (keptKeys.length / total) * 100 : 100
  const penaltyCleared = quest.penalty ? isObjectiveDone(quest.penalty, progress[quest.penalty.key] as ObjectiveProgress | undefined) : null
  let outcome = classifyDay(pct, keptKeys.length === total)
  if (penaltyCleared === false) outcome = 'FAILED'
  return { kept: keptKeys.length, total, pct, outcome, penaltyCleared, keptKeys }
}
