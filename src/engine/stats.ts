import { STAT_KEYS, type ObjectiveSpec, type StatKey, type StatRecord, type ObjectiveProgress } from './types'
import { isObjectiveDone } from './xp'

export const STAT_BASE = 10
/** Spec: each completed objective gives 10 stat-XP split across its tags. */
export const STAT_XP_PER_OBJECTIVE = 10
/** Calibration multiplier so a stat trained daily at full protocol reaches ~50 in 12 months (see stats.test.ts). */
export const STAT_XP_SCALE = 1.5
export const SCROLL_DEBUFF = 0.8 // FOC stat-XP x0.8 on days over screen-time target
export const RUST_DAYS = 7

export const STAT_NAMES: Record<StatKey, string> = {
  STR: 'Strength',
  VIT: 'Vitality',
  INT: 'Intellect',
  FOC: 'Focus',
  WIL: 'Willpower',
  ORD: 'Order',
  NRV: 'Nerve',
  WIS: 'Wisdom',
  SEN: 'Sense',
  LCK: 'Luck',
}

export const STAT_NOTES: Partial<Record<StatKey, string>> = {
  INT: 'Adult IQ scores are fairly stable. The System trains applied intelligence: knowledge, reasoning, learning speed and better methods.',
  LCK: "You can't control luck. You can increase your exposure to it: do more, and tell more people what you do.",
}

export function emptyStats(): StatRecord {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as StatRecord
}

/** Stat-XP cost to raise a stat from n to n+1. */
export function costToRaise(n: number): number {
  return 40 + 4 * (n - STAT_BASE)
}

/** Cumulative stat-XP needed to hold `level` starting from `base`. */
export function statXpForLevel(level: number, base = STAT_BASE): number {
  let total = 0
  for (let n = base; n < level; n++) total += costToRaise(n)
  return total
}

export function statLevel(statXp: number, base = STAT_BASE): number {
  let n = base
  let left = statXp
  while (left >= costToRaise(n)) {
    left -= costToRaise(n)
    n++
  }
  return n
}

export function statProgress(statXp: number, base = STAT_BASE): { level: number; into: number; need: number } {
  const level = statLevel(statXp, base)
  const into = statXp - statXpForLevel(level, base)
  return { level, into: Math.round(into), need: costToRaise(level) }
}

/** Stat-XP earned by one completed objective. */
export function objectiveStatXp(
  spec: ObjectiveSpec,
  opts: { weeklyFocusStat?: StatKey | null; scrollDebuff?: boolean } = {},
): StatRecord {
  const out = emptyStats()
  const share = (STAT_XP_PER_OBJECTIVE * STAT_XP_SCALE) / spec.stats.length
  for (const s of spec.stats) {
    let v = share
    if (opts.weeklyFocusStat === s) v *= 1.5
    if (opts.scrollDebuff && s === 'FOC') v *= SCROLL_DEBUFF
    out[s] += v
  }
  return out
}

export function dayStatXp(
  specs: readonly ObjectiveSpec[],
  progress: Partial<Record<string, ObjectiveProgress>>,
  opts: { weeklyFocusStat?: StatKey | null; scrollDebuff?: boolean } = {},
): StatRecord {
  const out = emptyStats()
  for (const spec of specs) {
    if (!isObjectiveDone(spec, progress[spec.key])) continue
    const add = objectiveStatXp(spec, opts)
    for (const k of STAT_KEYS) out[k] += add[k]
  }
  return out
}

export function addStats(a: StatRecord, b: Partial<StatRecord>): StatRecord {
  const out = { ...a }
  for (const k of STAT_KEYS) out[k] += b[k] ?? 0
  return out
}

/** Visual-only tag: a stat untrained for 7+ days. */
export function isRusty(lastTrainedDay: string | null | undefined, today: string, diff: (a: string, b: string) => number): boolean {
  if (!lastTrainedDay) return false
  return diff(lastTrainedDay, today) >= RUST_DAYS
}
