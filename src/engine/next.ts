import { isObjectiveDone } from './xp'
import type { DayOutcome, ObjectiveSpec, ProgressMap, QuestSpec } from './types'

const EVENING: ReadonlySet<string> = new Set(['TEACH_BACK', 'SHUTDOWN', 'GUILD_REPORT'])
const EVENING_FROM_MIN = 19 * 60

/**
 * The ONE next objective the System tells the Player to do. The Player never chooses.
 * Penalty Quest first; then morning/daytime objectives in order; evening objectives once those are done or it is evening.
 */
export function nextObjective(quest: QuestSpec, progress: ProgressMap, minuteOfDay: number): ObjectiveSpec | null {
  if (quest.penalty && !isObjectiveDone(quest.penalty, progress[quest.penalty.key])) return quest.penalty
  const undone = quest.objectives.filter((o) => !isObjectiveDone(o, progress[o.key]))
  if (!undone.length) return null
  const isEvening = (o: ObjectiveSpec) => EVENING.has(o.id) || (o.id === 'RITUAL' && o.window === 'Night before')
  const day = undone.filter((o) => !isEvening(o))
  const eve = undone.filter(isEvening)
  if (minuteOfDay >= EVENING_FROM_MIN && eve.length) return eve[0]
  return day[0] ?? eve[0] ?? null
}

/** Streak: COMPLETE +1, PARTIAL holds, FAILED resets. Outcomes oldest -> newest. */
export function streakFrom(outcomes: readonly (DayOutcome | null)[]): number {
  let s = 0
  for (const o of outcomes) {
    if (o === 'COMPLETE') s++
    else if (o === 'FAILED') s = 0
  }
  return s
}
