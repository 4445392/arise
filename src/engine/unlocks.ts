import type { Mode } from './types'
import type { Rank } from './ranks'
import { RANK_ORDER } from './ranks'

export type Feature =
  | 'status'
  | 'dailyQuest'
  | 'timer'
  | 'pulses'
  | 'journal'
  | 'fearLog'
  | 'guildReport'
  | 'shadowArmy'
  | 'hiddenQuests'
  | 'playerManual'
  | 'shop'
  | 'titles'
  | 'emergencyQuests'
  | 'gates'
  | 'decisionJournal'
  | 'signatureSkills'
  | 'jobChange'
  | 'skillGates'
  | 'courage'
  | 'strategy'
  | 'mainQuest'

interface Rule {
  level?: number
  rank?: Rank
  /** Needs BREAK or SEMESTER mode (i.e. not EXAM). */
  afterExams?: boolean
}

const RULES: Record<Feature, Rule> = {
  status: { level: 1 },
  dailyQuest: { level: 1 },
  timer: { level: 1 },
  pulses: { level: 1 },
  journal: { level: 1 },
  fearLog: { level: 1 },
  guildReport: { level: 1 },
  shadowArmy: { level: 2 },
  hiddenQuests: { level: 3 },
  playerManual: { level: 5 },
  shop: { level: 6 },
  titles: { level: 8 },
  emergencyQuests: { level: 8 },
  gates: { rank: 'D' },
  decisionJournal: { rank: 'D' },
  signatureSkills: { level: 20 },
  jobChange: { level: 25 },
  skillGates: { afterExams: true },
  courage: { afterExams: true },
  strategy: { afterExams: true },
  mainQuest: { afterExams: true },
}

export interface UnlockState {
  level: number
  mode: Mode
  /** Highest rank reached by level (D-Rank features open at Lv10). */
  rank: Rank
}

export type Lock = { locked: false } | { locked: true; label: string }

export function checkUnlock(feature: Feature, s: UnlockState): Lock {
  const r = RULES[feature]
  if (r.afterExams && s.mode === 'EXAM') return { locked: true, label: 'LOCKED — after the final boss' }
  if (r.level && s.level < r.level) return { locked: true, label: `LOCKED — Lv.${r.level}` }
  if (r.rank && RANK_ORDER.indexOf(s.rank) < RANK_ORDER.indexOf(r.rank)) return { locked: true, label: `LOCKED — ${r.rank}-Rank` }
  return { locked: false }
}

export function isUnlocked(feature: Feature, s: UnlockState): boolean {
  return !checkUnlock(feature, s).locked
}
