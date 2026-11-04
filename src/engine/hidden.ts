import { HIDDEN_QUESTS, type HiddenQuest } from '../content/hiddenQuests'
import { addDays, weekday } from './day'
import { createRng } from './rng'

/** Monday of the week containing `day` (week key). */
export function weekKey(day: string): string {
  const w = weekday(day)
  return addDays(day, w === 0 ? -6 : 1 - w)
}

export const HIDDEN_MIN_LEVEL = 3

/** 1-2 Hidden Quests per week on random Mon-Sat days; deterministic per week. */
export function hiddenSchedule(week: string): { day: string; quest: HiddenQuest }[] {
  const rng = createRng(`hidden:${week}`)
  const count = rng.int(1, 2)
  const offsets: number[] = []
  while (offsets.length < count) {
    const o = rng.int(0, 5)
    if (!offsets.includes(o)) offsets.push(o)
  }
  const ids: number[] = []
  while (ids.length < count) {
    const i = rng.int(0, HIDDEN_QUESTS.length - 1)
    if (!ids.includes(i)) ids.push(i)
  }
  return offsets.sort((a, b) => a - b).map((o, k) => ({ day: addDays(week, o), quest: HIDDEN_QUESTS[ids[k]] }))
}

/** The Hidden Quest appearing today (if any). It stays open until the end of the week. */
export function hiddenForDay(day: string, level: number): HiddenQuest[] {
  if (level < HIDDEN_MIN_LEVEL) return []
  const wk = weekKey(day)
  return hiddenSchedule(wk)
    .filter((h) => h.day <= day)
    .map((h) => h.quest)
}
