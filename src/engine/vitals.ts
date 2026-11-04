import { addDays } from './day'

export interface CheckIn {
  sleepHours: number
  sleepQuality: number // 1-5
  energy: number // 1-5
  mood: number // 1-5
  pain: boolean
  painWhere?: string
}

export const HP_RECOVERY_BELOW = 40
export const HP_FATIGUE_BELOW = 60
export const FATIGUE_DELOAD_AT = 3

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** HP (0-100) from sleep hours (up to 70) and sleep quality (up to 30). */
export function hpFromSleep(sleepHours: number, sleepQuality: number): number {
  const hours = Math.pow(clamp(sleepHours / 8, 0, 1), 1.5) * 70
  const quality = ((clamp(sleepQuality, 1, 5) - 1) / 4) * 30
  return Math.round(clamp(hours + quality, 0, 100))
}

/** MP (0-100) from energy (60) and mood (40). */
export function mpFrom(energy: number, mood: number): number {
  const e = ((clamp(energy, 1, 5) - 1) / 4) * 60
  const m = ((clamp(mood, 1, 5) - 1) / 4) * 40
  return Math.round(clamp(e + m, 0, 100))
}

export function vitalsFrom(c: CheckIn): { hp: number; mp: number } {
  return { hp: hpFromSleep(c.sleepHours, c.sleepQuality), mp: mpFrom(c.energy, c.mood) }
}

export function needsRecovery(hp: number): boolean {
  return hp < HP_RECOVERY_BELOW
}

/**
 * Fatigue builds on consecutive full-load days while HP < 60.
 * A rested day (HP >= 60) or a lighter day lets it drain by 1.
 */
export function fatigueStep(fatigue: number, hp: number, wasFullLoadDay: boolean): number {
  if (hp < HP_FATIGUE_BELOW && wasFullLoadDay) return fatigue + 1
  return Math.max(0, fatigue - 1)
}

export function needsDeload(fatigue: number): boolean {
  return fatigue >= FATIGUE_DELOAD_AT
}

export interface MoodDay {
  dayKey: string
  mood: number
}

/** Mood <= 2 on at least 5 of the 7 days ending at `endDay` (needs actual entries, not guesses). */
export function lowMoodTriggered(moods: readonly MoodDay[], endDay: string): boolean {
  const from = addDays(endDay, -6)
  const lows = new Set<string>()
  for (const m of moods) if (m.dayKey >= from && m.dayKey <= endDay && m.mood <= 2) lows.add(m.dayKey)
  return lows.size >= 5
}

/** Support card shows (and load is -25 %) for 3 days after the trigger: today or either of the 2 days before. */
export function lowMoodLoadActive(moods: readonly MoodDay[], today: string): boolean {
  return [0, 1, 2].some((back) => lowMoodTriggered(moods, addDays(today, -back)))
}

export const LOW_MOOD_LOAD_FACTOR = 0.75
export const RECOVERY_LOAD_FACTOR = 0.5
export const DELOAD_LOAD_FACTOR = 0.75
