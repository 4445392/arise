import type { DayOutcome, ObjectiveSpec } from './types'

export const COMPLETE_PCT = 100
export const PARTIAL_PCT = 70
export const RECOVERY_DAYS = 3

export function classifyDay(pct: number, allKept: boolean): DayOutcome {
  if (allKept && pct >= COMPLETE_PCT) return 'COMPLETE'
  if (pct >= PARTIAL_PCT) return 'PARTIAL'
  return 'FAILED'
}

/** Carried between days. */
export interface PenaltyState {
  consecutiveFails: number
  /** Penalty Quest will be issued on the next day. */
  penaltyPending: boolean
  /** Remaining recovery-mode days (3 at 50 % load, no penalties). */
  recoveryDaysLeft: number
}

export const INITIAL_PENALTY_STATE: PenaltyState = { consecutiveFails: 0, penaltyPending: false, recoveryDaysLeft: 0 }

/**
 * Close a day and compute what tomorrow looks like.
 * FAILED -> Penalty Quest tomorrow. Two FAILED in a row -> RECOVERY MODE (3 days, 50 % load, no penalties).
 * The Penalty Quest not being cleared makes the day FAILED (decided by the caller via scoreDay).
 */
export function advancePenaltyState(state: PenaltyState, outcome: DayOutcome, wasRecoveryDay: boolean): PenaltyState {
  if (wasRecoveryDay) {
    return {
      consecutiveFails: 0,
      penaltyPending: false,
      recoveryDaysLeft: Math.max(0, state.recoveryDaysLeft - 1),
    }
  }
  if (outcome === 'FAILED') {
    const fails = state.consecutiveFails + 1
    if (fails >= 2) return { consecutiveFails: 0, penaltyPending: false, recoveryDaysLeft: RECOVERY_DAYS }
    return { consecutiveFails: fails, penaltyPending: true, recoveryDaysLeft: 0 }
  }
  return { consecutiveFails: 0, penaltyPending: false, recoveryDaysLeft: 0 }
}

export function isRecoveryDay(state: PenaltyState): boolean {
  return state.recoveryDaysLeft > 0
}

export interface PenaltyInput {
  dragon?: string | null
  hpLow: boolean
}

/** Penalty Quest: 20 min on the current Dragon task, or a 30-min walk if HP is low. */
export function penaltyQuest(input: PenaltyInput): ObjectiveSpec {
  if (input.hpLow) {
    return {
      id: 'PENALTY',
      key: 'PENALTY',
      title: 'PENALTY QUEST: Walk it off',
      desc: 'Your HP is low. A 30-minute walk clears this quest. Firm, not harsh.',
      minutes: 30,
      stats: ['WIL', 'VIT'],
      window: 'Before lights-out',
      kind: 'timer',
      target: 30,
      unit: 'min',
      ref: 'penalty',
    }
  }
  const dragon = input.dragon?.trim() || 'your hardest unfinished task'
  return {
    id: 'PENALTY',
      key: 'PENALTY',
    title: 'PENALTY QUEST: Face the Dragon',
    desc: `20 minutes on ${dragon}. Clear it before the deadline.`,
    minutes: 20,
    stats: ['WIL', 'FOC'],
    window: 'Before lights-out',
    kind: 'timer',
    target: 20,
    unit: 'min',
    ref: 'penalty',
  }
}
