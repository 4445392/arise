import type { PenaltyState } from '../engine/penalties'
import type { Rank } from '../engine/ranks'
import type { FearOutcome } from '../engine/fear'
import type { DayOutcome, Mode, ProgressMap, QuestSpec, StatKey, StatRecord } from '../engine/types'

export interface Settings {
  id: 1
  name: string
  wakeWeekday: string
  wakeWeekend: string
  lightsOut: string
  gymDays: number[]
  lastExamDay: string
  restartDay: string
  studyTargetMin: number
  sound: boolean
  voice: boolean
  /** Weekly commitments budget (Phase 8 UI). */
  commitments: { id: string; label: string; minutes: number }[]
  commitmentsBudgetMin: number
  /** Main Quest window text, moved by the Mirror once it finds the real peak. */
  mainQuestWindow: string
  onboarded: boolean
  /** Last day a JSON backup was exported (drives the Sunday reminder). */
  lastBackupDay?: string
}

export interface Player {
  id: 1
  installDay: string
  createdTs: number
  passedRanks: Rank[]
  penalty: PenaltyState
  fatigue: number
  rampWeek: number
  rampAnchor: string | null
  weeklyFocusStat: StatKey | null
  lastModeSeen: Mode | null
  /** Last game day that has been closed (scored, penalties/fatigue applied). */
  lastClosedDay: string | null
  becoming?: string[]
}

export interface CheckInRec {
  sleepHours: number
  sleepQuality: number
  energy: number
  mood: number
  pain: boolean
  painWhere?: string
  hp: number
  mp: number
  ts: number
}

export interface DayFlags {
  recovery: boolean
  deload: boolean
  lowMood: boolean
  hpRecovery: boolean
}

export interface DayLog {
  dayKey: string
  mode: Mode
  quest: QuestSpec
  progress: ProgressMap
  flags: DayFlags
  checkIn?: CheckInRec
  screenMin?: number
  // derived (recomputed on every change)
  kept: number
  total: number
  pct: number
  outcome: DayOutcome | null
  xp: number
  statXp: StatRecord
  /** Objective keys finished after lights-out: they count as kept but forfeit the on-time (COMPLETE) bonus. */
  lateKeys: string[]
  closed: boolean
}

export interface XpEvent {
  id?: number
  ts: number
  dayKey: string
  source: string
  label: string
  xp: number
  statXp?: Partial<StatRecord>
}

export interface Exam {
  id?: number
  subject: string
  dateKey: string
  showedUp?: boolean
  resultPct?: number | null
  resultLoggedTs?: number
}

export interface PulseRec {
  id?: number
  ts: number
  dayKey: string
  slot: 1 | 2 | 3
  energy: number
  /** null for the morning check-in (it does not ask about focus). */
  focus: number | null
  mood: number
  activity: string
  urge: boolean
}

export interface DriftRec {
  id?: number
  ts: number
  dayKey: string
  cause: string
  note?: string
  reentryTs?: number
  reentryMin?: number
}

export interface JournalEntry {
  id?: number
  ts: number
  dayKey: string
  kept: string
  fear: string
  lesson: string
  /** EXAM mode: tomorrow's first study block, named at Shutdown. */
  nextBlock?: string
}

export interface FearEntry {
  id?: number
  ts: number
  dayKey: string
  situation: string
  afraid: string
  predicted: number
  severity: number
  ifThen: string
  checkBack: string
  examId?: number
  outcome?: FearOutcome | null
  whatHappened?: string
  resolvedTs?: number
}

export interface DeepWorkSession {
  id?: number
  ts: number
  dayKey: string
  objectiveKey: string
  subject?: string
  plannedMin: number
  minutes: number
  phoneAway: boolean
  interruptions: number
  quality: number
  note?: string
  startDelayMin?: number
}

// ---- entities used from Phase 5 onward; the schema is in v1 so no migration is needed later ----
export interface Shadow { id?: number; ts: number; name: string; severity: number; fearId?: number }
export interface MotiveTag { id?: number; ts: number; dayKey: string; objectiveKey: string; motive: string }
export interface ObjectiveFeedback { id?: number; ts: number; dayKey: string; objectiveKey: string; difficulty: number; enjoyment: number; startDelayMin?: number }
export interface ThoughtAudit { id?: number; ts: number; weekKey: string; traps: Record<string, number> }
export interface CourageRung { id?: number; ts: number; rung: number; label: string; fearBefore: number; fearAfter: number; rejected: boolean; note?: string }
export interface SkillGate { id?: number; skillId: string; startDay: string; clearedDay?: string; checkpoints: Record<string, boolean> }
export interface SkillLevel { id?: number; skillId: string; minutes: number }
export interface ReadingLog { id?: number; ts: number; dayKey: string; book: string; minutes: number; pages?: number; takeaway?: string; finished?: boolean }
export interface GoldEntry { id?: number; ts: number; dayKey: string; amountZar: number; source: string; mainQuest?: boolean }
export interface Decision { id?: number; ts: number; decision: string; expected: string; why: string; confidence: number; reviewDay: string; outcome?: string; lesson?: string }
export interface Assessment { id?: number; ts: number; kind: 'ipip' | 'values' | 'becoming'; result: unknown }
export interface ScreenTimeLog { id?: number; dayKey: string; minutes: number }
export interface TitleState { id?: number; titleId: string; earnedTs: number; equipped: boolean }
export interface Purchase { id?: number; ts: number; itemId: string; essence: number }
export interface WeeklyReport { id?: number; weekKey: string; ts: number; text: string; focusStat?: StatKey }
export interface Recording { id?: number; ts: number; dayKey: string; blob: Blob; seconds: number }
