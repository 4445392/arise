import { SKILLS, type SkillDef } from '../content/skills'
import { RANK_ORDER, type Rank } from './ranks'
import { STAT_KEYS, type StatKey } from './types'
import type { RampDecision } from './trust'

// ============================================================ Daily Trio, steps, screen time (spec 4.5, 6.12)
export const TRIO_CAP = 100
export const TRIO_MIN = 5
export const STEPS_CAP = 10_000

export function initialTrio(max: number): number {
  return Math.max(TRIO_MIN, Math.min(TRIO_CAP, Math.ceil(max * 0.5)))
}

/** +10 % per week (minimum +2), capped at 100; same trust rule as the ramp. */
export function nextTrio(current: number, d: RampDecision): number {
  const step = Math.max(2, Math.ceil(current * 0.1))
  if (d === 'advance') return Math.min(TRIO_CAP, current + step)
  if (d === 'step_back') return Math.max(TRIO_MIN, current - step)
  return current
}

/** Split into sets of at most 25 (tap-a-set buttons). */
export function toSets(total: number, maxSet = 25): number[] {
  const sets: number[] = []
  let left = total
  while (left > 0) {
    const s = Math.min(maxSet, left)
    sets.push(s)
    left -= s
  }
  return sets
}

export const initialSteps = (baseline: number) => Math.min(STEPS_CAP, baseline + 1000)
export function nextSteps(current: number, d: RampDecision): number {
  if (d === 'advance') return Math.min(STEPS_CAP, current + 500)
  if (d === 'step_back') return Math.max(1000, current - 500)
  return current
}

export const SCREEN_FLOOR_MIN = 120
export const initialScreenTarget = (baselineMin: number) => Math.max(SCREEN_FLOOR_MIN, Math.round(baselineMin * 0.9))
/** Drops 10 % a week while promises are kept (floor 2 h/day); eases back if they are not. */
export function nextScreenTarget(current: number, baselineMin: number, d: RampDecision): number {
  if (d === 'advance') return Math.max(SCREEN_FLOOR_MIN, Math.round(current * 0.9))
  if (d === 'step_back') return Math.min(Math.round(baselineMin), Math.round(current * 1.1))
  return current
}
export const overScreenTarget = (minutes: number, target: number) => minutes > target

// ============================================================ Skills
export type SkillRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'
const SKILL_STEPS: [SkillRank, number][] = [['E', 0], ['D', 20], ['C', 100], ['B', 300], ['A', 1000], ['S', 3000]]

/** E 0-20 h · D 20-100 · C 100-300 · B 300-1,000 · A 1,000-3,000 · S 3,000+ with external proof. */
export function skillRank(hours: number, externalProof = false): SkillRank {
  let r: SkillRank = 'E'
  for (const [k, h] of SKILL_STEPS) if (hours >= h) r = k
  return r === 'S' && !externalProof ? 'A' : r
}

/** The System picks: of the next 3 in the queue, the one that trains the Player's weakest stats. */
export function pickNextSkill(doneIds: readonly string[], stats: Record<StatKey, number>): SkillDef | null {
  const next3 = SKILLS.filter((s) => !doneIds.includes(s.id)).slice(0, 3)
  if (!next3.length) return null
  const score = (s: SkillDef) => s.stats.reduce((a, k) => a + stats[k], 0) / s.stats.length
  return [...next3].sort((a, b) => score(a) - score(b))[0]
}

// ============================================================ Courage Ladder
export interface Attempt {
  rung: number // 1-based
  fearBefore: number
  fearAfter: number
  rejected?: boolean
}

export const ADVANCE_ATTEMPTS = 5
export const ADVANCE_FEAR_BELOW = 40

/** Move up a level after 5 attempts at it with an after-fear < 40. */
export function courageLevel(attempts: readonly Attempt[], rungs = 10): number {
  let level = 1
  while (level < rungs) {
    const good = attempts.filter((a) => a.rung === level && a.fearAfter < ADVANCE_FEAR_BELOW).length
    if (good >= ADVANCE_ATTEMPTS) level++
    else break
  }
  return level
}

export const rejectionsCollected = (attempts: readonly Attempt[]) => attempts.filter((a) => a.rejected).length

/** Merge his personal avoid-list (rated 0-100) with the defaults (rated by position) into a 10-rung ladder, easiest first. */
export function buildLadder(defaults: readonly string[], personal: readonly { label: string; rating: number }[]): string[] {
  const all = [...defaults.map((label, i) => ({ label, rating: (i + 1) * 10 })), ...personal.filter((p) => p.label.trim()).map((p) => ({ label: p.label.trim(), rating: p.rating }))]
  all.sort((a, b) => a.rating - b.rating)
  if (all.length <= 10) return all.map((a) => a.label)
  const out: string[] = []
  for (let i = 0; i < 10; i++) out.push(all[Math.round((i * (all.length - 1)) / 9)].label)
  return out
}

// ============================================================ Jobs (Lv25)
export const JOBS = [
  { id: 'Strategist', stats: ['SEN', 'INT'], passive: '+10 % SEN and INT XP' },
  { id: 'Architect', stats: ['ORD', 'INT'], passive: '+10 % ORD and INT XP' },
  { id: 'Vanguard', stats: ['NRV', 'STR'], passive: '+10 % NRV and STR XP' },
  { id: 'Sage', stats: ['WIS', 'INT'], passive: '+10 % WIS and INT XP' },
  { id: 'Merchant', stats: ['SEN', 'LCK'], passive: '+10 % SEN and LCK XP' },
  { id: 'Monk', stats: ['FOC', 'WIL'], passive: '+10 % FOC and WIL XP' },
] as const

/** Assigned from data (top stats), never chosen. */
export function assignJob(stats: Record<StatKey, number>): (typeof JOBS)[number] {
  let best: (typeof JOBS)[number] = JOBS[0]
  let bestScore = -1
  for (const j of JOBS) {
    const s = stats[j.stats[0]] + stats[j.stats[1]]
    if (s > bestScore) {
      best = j
      bestScore = s
    }
  }
  return best
}

// ============================================================ Titles (Lv8+)
export interface TitleCtx {
  onTimeAwakenStreak: number
  trust30: number | null
  shadows: number
  trioAt100: boolean
  screenUnderDays: number
  libraryBooks: number
  mainQuestGold: number
  puzzleGain: number
  reentries30: number
  decoded: number
}

export interface TitleDef {
  id: string
  name: string
  cond: string
  effect: { kind: 'allXp' | 'stat' | 'mainQuest'; stat?: StatKey; pct: number }
  test: (c: TitleCtx) => boolean
}

export const TITLES: TitleDef[] = [
  { id: 'wakes', name: 'The One Who Wakes', cond: '14 on-time Awakens in a row', effect: { kind: 'stat', stat: 'VIT', pct: 5 }, test: (c) => c.onTimeAwakenStreak >= 14 },
  { id: 'promises', name: 'Keeper of Promises', cond: '30-day TRUST ≥ 90 %', effect: { kind: 'allXp', pct: 5 }, test: (c) => (c.trust30 ?? 0) >= 90 },
  { id: 'fear-eater', name: 'Fear Eater', cond: '10 Shadows', effect: { kind: 'stat', stat: 'NRV', pct: 10 }, test: (c) => c.shadows >= 10 },
  { id: 'iron', name: 'Iron Body', cond: 'Daily Trio at 100/100/100', effect: { kind: 'stat', stat: 'STR', pct: 10 }, test: (c) => c.trioAt100 },
  { id: 'silent', name: 'Silent Hunter', cond: '7 days under screen-time target', effect: { kind: 'stat', stat: 'FOC', pct: 10 }, test: (c) => c.screenUnderDays >= 7 },
  { id: 'scholar', name: 'Scholar', cond: '5 Library books', effect: { kind: 'stat', stat: 'WIS', pct: 10 }, test: (c) => c.libraryBooks >= 5 },
  { id: 'merchant', name: 'Merchant', cond: 'First R1,000 from the Main Quest', effect: { kind: 'mainQuest', pct: 10 }, test: (c) => c.mainQuestGold >= 1000 },
  { id: 'strategist', name: 'Strategist', cond: '+200 puzzle rating from baseline', effect: { kind: 'stat', stat: 'SEN', pct: 10 }, test: (c) => c.puzzleGain >= 200 },
  { id: 'returner', name: 'The Returner', cond: '10 re-entries within 30 min of a drift', effect: { kind: 'stat', stat: 'WIL', pct: 10 }, test: (c) => c.reentries30 >= 10 },
  { id: 'know-thyself', name: 'Know Thyself', cond: 'DECODED ≥ 50 %', effect: { kind: 'stat', stat: 'WIS', pct: 10 }, test: (c) => c.decoded >= 50 },
]

export const earnedTitles = (c: TitleCtx): string[] => TITLES.filter((t) => t.test(c)).map((t) => t.id)

/** All-XP multiplier from an equipped title (e.g. 1.05). */
export function titleXpMult(id: string | null | undefined): number {
  const t = TITLES.find((x) => x.id === id)
  return t?.effect.kind === 'allXp' ? 1 + t.effect.pct / 100 : 1
}
export function titleStatMult(id: string | null | undefined, stat: StatKey): number {
  const t = TITLES.find((x) => x.id === id)
  return t?.effect.kind === 'stat' && t.effect.stat === stat ? 1 + t.effect.pct / 100 : 1
}

// ============================================================ Shop (Lv6+)
export interface ShopItem { id: string; name: string; price: number; minRank: Rank }
export const SHOP: ShopItem[] = [
  { id: 'gaming', name: '1 h gaming / series', price: 150, minRank: 'E' },
  { id: 'treat', name: 'Treat meal', price: 300, minRank: 'E' },
  { id: 'movie', name: 'Movie night', price: 400, minRank: 'E' },
  { id: 'book', name: 'New book', price: 400, minRank: 'E' },
  { id: 'lie-in', name: 'Sunday lie-in (+2 h)', price: 500, minRank: 'E' },
  { id: 'gear', name: 'Gym gear item', price: 2000, minRank: 'D' },
  { id: 'day-out', name: 'A full day out', price: 3000, minRank: 'C' },
  { id: 'big-treat', name: 'A bigger reward you choose', price: 6000, minRank: 'B' },
]
export const essenceOf = (totalXp: number, spent: number) => Math.max(0, Math.floor(totalXp / 10) - spent)
export const canBuy = (item: ShopItem, essence: number, rank: Rank): boolean => essence >= item.price && RANK_ORDER.indexOf(rank) >= RANK_ORDER.indexOf(item.minRank)

// ============================================================ Rank Exams (spec 7.5; B and above are drafts)
export interface ExamCtx {
  completeDaysLast30: number
  trust30: number | null
  decoded: number
  shadows: number
  skillGatesCleared: number
  firstBossCleared: boolean
  mainQuestChaptersCleared: number
  mainQuestIComplete: boolean
  courageLevel: number
  libraryBooks: number
  goldBestMonth: number
}
export interface Criterion { label: string; met: boolean }

export function rankExam(rank: Rank, c: ExamCtx): Criterion[] {
  const t = c.trust30 ?? 0
  switch (rank) {
    case 'D':
      return [
        { label: '25 of the last 30 Daily Quests complete', met: c.completeDaysLast30 >= 25 },
        { label: 'TRUST (30 day) ≥ 80 %', met: t >= 80 },
        { label: 'DECODED ≥ 25 %', met: c.decoded >= 25 },
        { label: '5 Shadows', met: c.shadows >= 5 },
        { label: 'Skill Gate #1 Boss cleared', met: c.firstBossCleared },
        { label: 'Main Quest chapter 2 cleared', met: c.mainQuestChaptersCleared >= 2 },
      ]
    case 'C':
      return [
        { label: '3 Skill Gates cleared', met: c.skillGatesCleared >= 3 },
        { label: '20 Shadows', met: c.shadows >= 20 },
        { label: 'Main Quest I complete', met: c.mainQuestIComplete },
        { label: 'DECODED ≥ 50 %', met: c.decoded >= 50 },
        { label: 'Courage Ladder level ≥ 6', met: c.courageLevel >= 6 },
        { label: '6 Library books', met: c.libraryBooks >= 6 },
      ]
    case 'B':
      return [
        { label: '7 Skill Gates cleared', met: c.skillGatesCleared >= 7 },
        { label: '40 Shadows', met: c.shadows >= 40 },
        { label: 'TRUST (30 day) ≥ 85 %', met: t >= 85 },
        { label: 'DECODED ≥ 70 %', met: c.decoded >= 70 },
        { label: 'Courage Ladder level ≥ 8', met: c.courageLevel >= 8 },
        { label: 'R15,000 earned in a month', met: c.goldBestMonth >= 15_000 },
      ]
    case 'A':
      return [
        { label: '11 Skill Gates cleared', met: c.skillGatesCleared >= 11 },
        { label: '70 Shadows', met: c.shadows >= 70 },
        { label: 'TRUST (30 day) ≥ 88 %', met: t >= 88 },
        { label: 'DECODED ≥ 85 %', met: c.decoded >= 85 },
        { label: 'Courage Ladder level 10', met: c.courageLevel >= 10 },
        { label: 'R50,000 earned in a month', met: c.goldBestMonth >= 50_000 },
      ]
    case 'S':
      return [
        { label: 'All 14 Skill Gates cleared', met: c.skillGatesCleared >= 14 },
        { label: '100 Shadows', met: c.shadows >= 100 },
        { label: 'TRUST (30 day) ≥ 90 %', met: t >= 90 },
        { label: 'DECODED ≥ 100 %', met: c.decoded >= 100 },
        { label: '12 Library books', met: c.libraryBooks >= 12 },
        { label: 'R100,000 earned in a month', met: c.goldBestMonth >= 100_000 },
      ]
    default:
      return [{ label: 'Draft: set at the next System Update', met: false }]
  }
}
export const examPassed = (rank: Rank, c: ExamCtx) => rankExam(rank, c).every((x) => x.met)

export { STAT_KEYS }
