import { describe, expect, it } from 'vitest'
import { generateDailyQuest } from './dailyQuest'
import { nextObjective, streakFrom } from './next'
import type { ProgressMap } from './types'

const q = generateDailyQuest({ mode: 'EXAM', dayKey: '2026-11-10', gymDays: [1, 3, 4, 6], rampWeek: 1, studyTargetMin: 60 })
const done = (keys: string[]): ProgressMap => {
  const p: ProgressMap = {}
  for (const o of q.objectives) if (keys.includes(o.key)) p[o.key] = o.kind === 'checklist' ? { items: o.items!.map((i) => i.id), value: 0 } : { items: [], value: o.target! }
  return p
}

describe('nextObjective', () => {
  it('starts with Awaken, then walks the list', () => {
    expect(nextObjective(q, {}, 8 * 60)!.id).toBe('AWAKEN')
    expect(nextObjective(q, done(['AWAKEN']), 9 * 60)!.id).toBe('BODY')
  })
  it('evening objectives wait until the daytime ones are done, or it is evening', () => {
    expect(nextObjective(q, done(['AWAKEN', 'BODY', 'DUNGEONS', 'LIBRARY']), 14 * 60)!.id).toBe('TEACH_BACK')
    expect(nextObjective(q, done(['AWAKEN']), 20 * 60)!.id).toBe('TEACH_BACK')
  })
  it('null when everything is done', () => {
    expect(nextObjective(q, done(q.objectives.map((o) => o.key)), 12 * 60)).toBeNull()
  })
  it('an uncleared penalty comes first', () => {
    const qp = generateDailyQuest({ mode: 'EXAM', dayKey: '2026-11-10', gymDays: [], rampWeek: 1, penalty: { hpLow: false } })
    expect(nextObjective(qp, {}, 9 * 60)!.id).toBe('PENALTY')
  })
})

describe('streakFrom', () => {
  it('COMPLETE +1, PARTIAL holds, FAILED resets', () => {
    expect(streakFrom(['COMPLETE', 'COMPLETE', 'PARTIAL', 'COMPLETE'])).toBe(3)
    expect(streakFrom(['COMPLETE', 'COMPLETE', 'FAILED', 'COMPLETE'])).toBe(1)
    expect(streakFrom([])).toBe(0)
  })
})
