import { addDays } from './day'
import { generateDailyQuest, scoreDay } from './dailyQuest'
import { advancePenaltyState, INITIAL_PENALTY_STATE, isRecoveryDay, type PenaltyState } from './penalties'
import { createRng } from './rng'
import { RANK_ORDER, type Rank } from './ranks'
import { nextRampWeek, rampDecision, trustPct, type PromiseDay } from './trust'
import { STAT_KEYS, type Mode, type ObjectiveSpec, type ProgressMap, type StatKey } from './types'
import { dayXp, resolveLevel } from './xp'
import { dayStatXp, emptyStats, addStats, statLevel } from './stats'

export interface SimOptions {
  days: number
  /** Share of days the Player completes the whole quest (85 % = the spec's "85 % completion"). */
  completion: number
  seed: number
  mode?: Mode
  startDay?: string
  /** Study minutes per day in EXAM mode. */
  studyTargetMin?: number
}

export interface SimDay {
  day: number
  xp: number
  totalXp: number
  level: number
  rank: Rank
  outcome: string
  rampWeek: number
  stats: Record<StatKey, number>
}

function doneProgress(o: ObjectiveSpec, full: boolean): ProgressMap[string] {
  if (o.kind === 'checklist') return { items: (o.items ?? []).map((i) => i.id), value: 0 }
  const v = o.target ?? o.minutes
  return { items: [], value: v, awayMin: o.dungeon && full ? Math.round(v * 0.8) : 0 }
}

/**
 * Deterministic simulation of the whole game loop using the real engine.
 * Model: on a "complete" day every objective is finished; otherwise each is finished with p = 0.5.
 * Rank Exams are passed the day after they become available.
 */
export function simulate(opts: SimOptions): SimDay[] {
  const rng = createRng(opts.seed)
  const mode = opts.mode ?? 'BREAK'
  const start = opts.startDay ?? '2026-11-26' // a Thursday
  let state: PenaltyState = INITIAL_PENALTY_STATE
  let rampWeek = 1
  let totalXp = 0
  let stats = emptyStats()
  const passed: Rank[] = []
  const promises: PromiseDay[] = []
  const out: SimDay[] = []

  for (let d = 0; d < opts.days; d++) {
    const key = addDays(start, d)
    const recovery = isRecoveryDay(state)
    const quest = generateDailyQuest({
      mode,
      dayKey: key,
      gymDays: [1, 3, 4, 6],
      rampWeek,
      recovery,
      penalty: state.penaltyPending && !recovery ? { hpLow: false } : null,
      studyTargetMin: opts.studyTargetMin ?? 120,
    })
    const complete = rng.chance(opts.completion)
    const progress: ProgressMap = {}
    for (const o of quest.objectives) {
      if (complete || rng.chance(0.5)) progress[o.key] = doneProgress(o, complete)
    }
    if (quest.penalty && (complete || rng.chance(0.6))) progress[quest.penalty.key] = doneProgress(quest.penalty, false)

    const score = scoreDay(quest, progress)
    const weeklyFocus = STAT_KEYS[Math.floor(d / 7) % STAT_KEYS.length]
    const xp = dayXp(quest.objectives, progress, score.outcome, { mode, weeklyFocusStat: weeklyFocus })
    stats = addStats(stats, dayStatXp(quest.objectives, progress, { weeklyFocusStat: weeklyFocus }))
    totalXp += xp.total
    promises.push({ dayKey: key, kept: score.kept, total: score.total })

    state = advancePenaltyState(state, score.outcome, recovery)

    // Weekly ramp decision (BREAK only), every 7th day.
    if (mode === 'BREAK' && (d + 1) % 7 === 0) rampWeek = nextRampWeek(rampWeek, rampDecision(trustPct(promises, key, 7)))

    let lv = resolveLevel(totalXp, passed)
    if (lv.examAvailable) {
      passed.push(lv.examAvailable)
      passed.sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b))
      lv = resolveLevel(totalXp, passed)
    }
    out.push({
      day: d + 1,
      xp: xp.total,
      totalXp,
      level: lv.level,
      rank: lv.rank,
      outcome: score.outcome,
      rampWeek,
      stats: Object.fromEntries(STAT_KEYS.map((k) => [k, statLevel(stats[k])])) as Record<StatKey, number>,
    })
  }
  return out
}

/** First day on which the simulation reached `level` (or null). */
export function dayReached(sim: readonly SimDay[], level: number): number | null {
  const hit = sim.find((s) => s.level >= level)
  return hit ? hit.day : null
}
