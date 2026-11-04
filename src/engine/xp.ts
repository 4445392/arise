import { levelCap, nextRankToEarn, rankForLevel, MAX_LEVEL, type Rank } from './ranks'
import type { ObjectiveProgress, ObjectiveSpec, DayOutcome, Mode, StatKey } from './types'

/**
 * Cumulative XP needed to REACH each anchor level. Piecewise-linear between anchors.
 * Calibrated by simulate.test.ts (BREAK-mode full protocol, 85 % of days complete):
 * Lv10 ~ day 30, Lv25 ~ day 120, Lv45 ~ month 12, Lv65 ~ month 24, Lv85 ~ month 36, Lv100 ~ month 48.
 * Early levels are cheap so Lv2 lands on day 1-2 and Lv5 within ~10 days of use.
 */
export const LEVEL_ANCHORS: ReadonlyArray<readonly [level: number, cumXp: number]> = [
  [1, 0],
  [2, 250],
  [3, 550],
  [5, 1400],
  [7, 3200],
  [10, 6300],
  [25, 31800],
  [45, 103500],
  [65, 208800],
  [85, 314000],
  [100, 420000],
]

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  const L = Math.min(level, MAX_LEVEL)
  for (let i = 1; i < LEVEL_ANCHORS.length; i++) {
    const [l1, x1] = LEVEL_ANCHORS[i]
    if (L <= l1) {
      const [l0, x0] = LEVEL_ANCHORS[i - 1]
      return x0 + ((x1 - x0) * (L - l0)) / (l1 - l0)
    }
  }
  return LEVEL_ANCHORS[LEVEL_ANCHORS.length - 1][1]
}

/** Level implied by XP alone, ignoring rank gates. */
export function rawLevel(xp: number): number {
  let level = 1
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++
  return level
}

export interface LevelState {
  level: number
  rank: Rank
  /** XP is past a rank boundary but the Rank Exam is not yet passed. */
  capped: boolean
  /** Rank whose exam is available, when capped. */
  examAvailable: Rank | null
  xpIntoLevel: number
  xpForNext: number
  /** 0..1 progress to the next level. */
  progress: number
}

export function resolveLevel(totalXp: number, passed: readonly Rank[]): LevelState {
  const raw = rawLevel(totalXp)
  const cap = levelCap(passed)
  const level = Math.min(raw, cap)
  const capped = raw > cap
  const base = xpForLevel(level)
  const next = xpForLevel(Math.min(level + 1, MAX_LEVEL))
  const span = Math.max(1, next - base)
  const into = capped ? span : Math.max(0, totalXp - base)
  return {
    level,
    rank: rankForLevel(level),
    capped,
    examAvailable: capped ? nextRankToEarn(passed) : null,
    xpIntoLevel: Math.round(Math.min(into, span)),
    xpForNext: Math.round(span),
    progress: level >= MAX_LEVEL ? 1 : Math.min(1, into / span),
  }
}

// ---------------------------------------------------------------- objective XP

export const COMPLETE_BONUS = 1.25
export const PHONE_AWAY_MULT = 1.25
export const WEEKLY_FOCUS_MULT = 1.5
export const EXAM_DUNGEON_DAILY_CAP = 180

export interface XpContext {
  mode: Mode
  weeklyFocusStat?: StatKey | null
  /** Equipped Title multiplier on all XP (e.g. 1.05). */
  titleMult?: number
}

export function isObjectiveDone(spec: ObjectiveSpec, p: ObjectiveProgress | undefined): boolean {
  if (!p) return false
  if (p.swapped) return true
  if (spec.kind === 'checklist') return !!spec.items && spec.items.every((i) => p.items.includes(i.id))
  return p.value >= (spec.target ?? 1)
}

/** XP an objective is worth right now (before the day's completion bonus). */
export function objectiveXp(spec: ObjectiveSpec, p: ObjectiveProgress | undefined, ctx: XpContext): number {
  if (!p) return 0
  let xp = 0
  if (spec.dungeon) {
    const logged = Math.min(p.value, spec.minutes * 2)
    const away = Math.min(p.awayMin ?? 0, logged)
    xp = logged - away + away * PHONE_AWAY_MULT
  } else if (isObjectiveDone(spec, p)) {
    xp = spec.minutes
  }
  if (ctx.weeklyFocusStat && spec.stats.includes(ctx.weeklyFocusStat)) xp *= WEEKLY_FOCUS_MULT
  return xp
}

export interface DayXp {
  base: number
  bonus: number
  total: number
}

export function dayXp(
  specs: readonly ObjectiveSpec[],
  progress: Partial<Record<string, ObjectiveProgress>>,
  outcome: DayOutcome,
  ctx: XpContext,
): DayXp {
  let base = 0
  let dungeon = 0
  for (const s of specs) {
    const xp = objectiveXp(s, progress[s.key], ctx)
    if (s.dungeon) dungeon += xp
    else base += xp
  }
  if (ctx.mode === 'EXAM') dungeon = Math.min(dungeon, EXAM_DUNGEON_DAILY_CAP)
  base += dungeon
  const bonus = outcome === 'COMPLETE' ? base * (COMPLETE_BONUS - 1) : 0
  const mult = ctx.titleMult ?? 1
  return { base: round1(base * mult), bonus: round1(bonus * mult), total: round1((base + bonus) * mult) }
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

// ---------------------------------------------------------------- Boss Raids

export const BOSS_SHOW_UP_XP = 150
export const BOSS_RESULT_XP = 75

export function bossRaidXp(showedUp: boolean, resultLogged: boolean): number {
  return (showedUp ? BOSS_SHOW_UP_XP : 0) + (showedUp && resultLogged ? BOSS_RESULT_XP : 0)
}
