// Shared engine types. Pure data only — no React, no Dexie.

export type Mode = 'EXAM' | 'BREAK' | 'SEMESTER'

export const STAT_KEYS = ['STR', 'VIT', 'INT', 'FOC', 'WIL', 'ORD', 'NRV', 'WIS', 'SEN', 'LCK'] as const
export type StatKey = (typeof STAT_KEYS)[number]
export type StatRecord = Record<StatKey, number>

export type ObjectiveId =
  | 'AWAKEN'
  | 'BODY'
  | 'STILLNESS'
  | 'MAIN_QUEST'
  | 'COURSEWORK'
  | 'DUNGEONS'
  | 'SKILL_GATE'
  | 'LIBRARY'
  | 'STRATEGY'
  | 'COURAGE'
  | 'TEACH_BACK'
  | 'SHUTDOWN'
  | 'RITUAL'
  | 'RECOVERY'
  | 'GUILD_REPORT'
  | 'PENALTY'

export type ObjectiveKind = 'checklist' | 'counter' | 'timer'

export interface ChecklistItem {
  id: string
  label: string
}

export interface ObjectiveSpec {
  id: ObjectiveId
  /** Unique per day: id, or id:ref when several of the same kind exist (e.g. rituals). */
  key: string
  title: string
  desc: string
  /** Planned minutes (budget + XP basis). */
  minutes: number
  stats: StatKey[]
  /** Recommended window text — never a fixed slot. */
  window: string
  kind: ObjectiveKind
  /** checklist: every item must be ticked. */
  items?: ChecklistItem[]
  /** counter/timer: numeric target (reps or minutes). */
  target?: number
  unit?: string
  /** Dungeon-type: XP follows logged minutes. */
  dungeon?: boolean
  /** Extra context, e.g. exam id for a ritual. */
  ref?: string
}

export interface ObjectiveProgress {
  items: string[]
  value: number
  /** Dungeon minutes logged with the phone in another room. */
  awayMin?: number
  /** Declared Swap: counts as kept. */
  swapped?: boolean
  /** Timestamp of the first interaction (start-delay measurement). */
  firstTs?: number
}

export type ProgressMap = Partial<Record<string, ObjectiveProgress>>

export interface LockedTeaser {
  id: string
  title: string
  reason: string
}

export interface QuestSpec {
  dayKey: string
  mode: Mode
  weekday: number
  isGymDay: boolean
  isSunday: boolean
  objectives: ObjectiveSpec[]
  locked: LockedTeaser[]
  penalty: ObjectiveSpec | null
  totalMinutes: number
  loadFactor: number
  notices: string[]
}

export type DayOutcome = 'COMPLETE' | 'PARTIAL' | 'FAILED'

export interface ExamInfo {
  id: string
  subject: string
  dateKey: string
}
