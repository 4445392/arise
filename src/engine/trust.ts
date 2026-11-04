import { addDays } from './day'

/** Promises (objectives) kept / made on one game day. */
export interface PromiseDay {
  dayKey: string
  kept: number
  total: number
}

/** TRUST = % of promises kept over the last `windowDays` days ending at `today` (inclusive). null when nothing was promised. */
export function trustPct(days: readonly PromiseDay[], today: string, windowDays: number): number | null {
  const from = addDays(today, -(windowDays - 1))
  let kept = 0
  let total = 0
  for (const d of days) {
    if (d.dayKey >= from && d.dayKey <= today) {
      kept += d.kept
      total += d.total
    }
  }
  if (total === 0) return null
  return (kept / total) * 100
}

export type RampDecision = 'advance' | 'hold' | 'step_back'

export const ADVANCE_AT = 85
export const STEP_BACK_BELOW = 70

/** Spec 4.3: advance at TRUST7 >= 85, hold 70-85, step back below 70. No data -> hold. */
export function rampDecision(trust7: number | null): RampDecision {
  if (trust7 === null) return 'hold'
  if (trust7 >= ADVANCE_AT) return 'advance'
  if (trust7 >= STEP_BACK_BELOW) return 'hold'
  return 'step_back'
}

/** Awakening Ramp week column (1..4). */
export function nextRampWeek(current: number, decision: RampDecision): 1 | 2 | 3 | 4 {
  const n = decision === 'advance' ? current + 1 : decision === 'step_back' ? current - 1 : current
  return Math.max(1, Math.min(4, n)) as 1 | 2 | 3 | 4
}

/** Generic numeric target stepper governed by the same rule (reps, steps, screen-time...). */
export function stepTarget(current: number, decision: RampDecision, step: number, min: number, max: number): number {
  const n = decision === 'advance' ? current + step : decision === 'step_back' ? current - step : current
  return Math.max(min, Math.min(max, n))
}

/** Easier-to-read copy shown with TRUST. */
export const TRUST_COPY = 'Your brain trusts evidence, not hype. Every kept promise is evidence.'
