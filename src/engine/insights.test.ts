import { describe, expect, it } from 'vitest'
import { band, computeInsights, decodedPct, quadrantOf, spearman, type InsightInput, type Insight } from './insights'

const empty = (): InsightInput => ({
  pulses: [],
  ratings: [],
  drifts: [],
  motives: [],
  sessions: [],
  days: [],
  fears: [],
  audits: [],
  ipip: null,
  values: null,
  skills: [],
  level: 1,
})
const get = (inp: InsightInput, id: string): Insight => computeInsights(inp).find((i) => i.id === id)!

// timestamps at a given Johannesburg hour on a given day offset
const at = (day: number, hour: number) => new Date(`2026-11-${String(1 + day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00+02:00`).getTime()

describe('every chapter is locked on empty data', () => {
  it('13 chapters, none unlocked, DECODED 0 %', () => {
    const all = computeInsights(empty())
    expect(all).toHaveLength(13)
    expect(all.every((i) => !i.unlocked)).toBe(true)
    expect(decodedPct(all)).toBe(0)
  })
})

describe('energy curve', () => {
  const pulses = (n: number, days: number) =>
    Array.from({ length: n }, (_, i) => {
      const hour = [9, 10, 14, 15, 20][i % 5]
      return { ts: at(i % days, hour), dayKey: `2026-11-0${1 + (i % days)}`, energy: hour <= 10 ? 5 : hour <= 15 ? 2 : 3, focus: 3, mood: 3, activity: 'study', urge: false }
    })
  it('locked at 20 pulses, locked at 21 pulses over 6 days', () => {
    expect(get({ ...empty(), pulses: pulses(20, 7) }, 'energy').unlocked).toBe(false)
    expect(get({ ...empty(), pulses: pulses(21, 6) }, 'energy').unlocked).toBe(false)
  })
  it('unlocks at 21 pulses over 7 days and finds the peak', () => {
    const i = get({ ...empty(), pulses: pulses(21, 7) }, 'energy')
    expect(i.unlocked).toBe(true)
    expect(i.sample).toBe(21)
    expect(i.headline).toContain('Energy peaks 09:00–11:00')
  })
})

describe('focus peak', () => {
  const sessions = (n: number) => Array.from({ length: n }, (_, i) => ({ startTs: at(i % 7, i % 2 ? 21 : 9), minutes: 50, quality: i % 2 ? 5 : 2 }))
  const pulses = Array.from({ length: 21 }, (_, i) => ({ ts: at(i % 7, 9), dayKey: `2026-11-0${1 + (i % 7)}`, energy: 3, focus: 3, mood: 3, activity: 'study', urge: false }))
  it('needs 10 sessions', () => {
    expect(get({ ...empty(), pulses, sessions: sessions(9) }, 'focus').unlocked).toBe(false)
  })
  it('finds the best window', () => {
    const i = get({ ...empty(), pulses, sessions: sessions(12) }, 'focus')
    expect(i.unlocked).toBe(true)
    expect(i.headline).toContain('21:00')
  })
})

describe('easy/hard map', () => {
  const ratings = (n: number) => Array.from({ length: n }, (_, i) => (i % 2 ? { objective: 'BODY', difficulty: 2, enjoyment: 5 } : { objective: 'LIBRARY', difficulty: 5, enjoyment: 1 }))
  it('locked at 29, unlocked at 30 with correct quadrants', () => {
    expect(get({ ...empty(), ratings: ratings(29) }, 'easyHard').unlocked).toBe(false)
    const i = get({ ...empty(), ratings: ratings(30) }, 'easyHard')
    expect(i.unlocked).toBe(true)
    const d = i.detail as { map: Record<string, string[]>; dragon: string }
    expect(d.map['Natural Talents']).toEqual(['BODY'])
    expect(d.map['Dragons']).toEqual(['LIBRARY'])
    expect(d.dragon).toBe('LIBRARY')
  })
  it('quadrants', () => {
    expect(quadrantOf(2, 4)).toBe('Natural Talents')
    expect(quadrantOf(4, 4)).toBe('Growth Zone')
    expect(quadrantOf(2, 2)).toBe('Chores')
    expect(quadrantOf(4, 2)).toBe('Dragons')
  })
})

describe('drift triggers and motivation', () => {
  const drifts = (n: number) => Array.from({ length: n }, (_, i) => ({ ts: at(i % 7, 14 + (i % 2)), cause: i < n * 0.6 ? 'phone' : 'tired' }))
  it('drift: 9 locked, 10 unlocked with the top cause %', () => {
    expect(get({ ...empty(), drifts: drifts(9) }, 'drift').unlocked).toBe(false)
    const i = get({ ...empty(), drifts: drifts(10) }, 'drift')
    expect(i.unlocked).toBe(true)
    expect(i.headline).toContain('60 %')
    expect(i.headline).toContain('phone')
  })
  it('motivation: 19 locked, 20 unlocked', () => {
    const m = (n: number) => Array.from({ length: n }, (_, i) => ({ motive: i % 3 ? 'mastery' : 'money' }))
    expect(get({ ...empty(), motives: m(19) }, 'motivation').unlocked).toBe(false)
    expect(get({ ...empty(), motives: m(20) }, 'motivation').headline).toContain('mastery, then money')
  })
})

describe('sleep and phone', () => {
  const days = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      dayKey: `2026-11-${String(i + 1).padStart(2, '0')}`,
      sleepHours: i % 2 ? 8 : 5,
      completionPct: i % 2 ? 100 : 50,
      screenMin: i % 2 ? 150 : 400,
      deepWorkMin: i % 2 ? 120 : 60,
    }))
  it('sleep: 13 locked, 14 unlocked, completion drop reported with a caveat', () => {
    expect(get({ ...empty(), days: days(13) }, 'sleep').unlocked).toBe(false)
    const i = get({ ...empty(), days: days(14) }, 'sleep')
    expect(i.unlocked).toBe(true)
    expect(i.headline).toContain('drops 50 %')
    expect(i.headline).toContain('correlation, not proof')
    expect((i.detail as { rho: number }).rho).toBeGreaterThan(0.9)
  })
  it('phone: 13 locked, 14 unlocked, deep work halves', () => {
    expect(get({ ...empty(), days: days(13) }, 'phone').unlocked).toBe(false)
    expect(get({ ...empty(), days: days(14) }, 'phone').headline).toContain('50 %')
  })
})

describe('start delay, fear, traps', () => {
  it('start delay: 29 locked, 30 unlocked', () => {
    const r = (n: number) => Array.from({ length: n }, (_, i) => ({ objective: i % 2 ? 'BODY' : 'COURAGE', difficulty: 3, enjoyment: 3, startDelayMin: i % 2 ? 5 : 47 }))
    expect(get({ ...empty(), ratings: r(29) }, 'startDelay').unlocked).toBe(false)
    const i = get({ ...empty(), ratings: r(30) }, 'startDelay')
    expect(i.unlocked).toBe(true)
    expect(i.headline).toContain('avg 47 min')
  })
  it('fear calibration: 4 locked, 5 unlocked', () => {
    const f = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, predicted: 60, severity: 5, outcome: i === 0 ? ('true' as const) : ('no' as const) }))
    expect(get({ ...empty(), fears: f(4) }, 'fear').unlocked).toBe(false)
    expect(get({ ...empty(), fears: f(5) }, 'fear').headline).toBe('You predict 60 %; it happens 20 % of the time.')
  })
  it('thinking traps: 3 locked, 4 unlocked', () => {
    const a = (n: number) => Array.from({ length: n }, () => ({ traps: { 'mind-reading': 3, catastrophising: 1 } }))
    expect(get({ ...empty(), audits: a(3) }, 'traps').unlocked).toBe(false)
    expect(get({ ...empty(), audits: a(4) }, 'traps').headline).toContain('mind-reading')
  })
})

describe('assessments and signature skills', () => {
  it('personality needs IPIP; bands not false precision', () => {
    expect(get(empty(), 'personality').unlocked).toBe(false)
    const i = get({ ...empty(), ipip: { E: 2, A: 4, C: 3, N: 4.5, O: 3 } }, 'personality')
    expect(i.unlocked).toBe(true)
    expect(i.headline).toContain('Extraversion low')
    expect(i.headline).toContain('Emotional stability low')
    expect(band(3.67)).toBe('average')
  })
  it('values needs the card sort', () => {
    expect(get({ ...empty(), values: [] }, 'values').unlocked).toBe(false)
    expect(get({ ...empty(), values: ['Growth', 'Honesty'] }, 'values').headline).toContain('Growth')
  })
  it('signature skills need Lv20 AND 5 gates', () => {
    const skills = Array.from({ length: 5 }, (_, i) => ({ name: `S${i}`, hours: 20, daysActive: 20 - i, avgEnjoyment: 1 + i }))
    expect(get({ ...empty(), skills, level: 19 }, 'signature').unlocked).toBe(false)
    expect(get({ ...empty(), skills: skills.slice(0, 4), level: 25 }, 'signature').unlocked).toBe(false)
    const i = get({ ...empty(), skills, level: 20 }, 'signature')
    expect(i.unlocked).toBe(true)
    expect(i.headline).toContain('S4')
  })
  it('DECODED % = unlocked / total', () => {
    const i = computeInsights({ ...empty(), values: ['Growth'], ipip: { E: 3, A: 3, C: 3, N: 3, O: 3 } })
    expect(decodedPct(i)).toBe(Math.round((2 / 13) * 100))
  })
})

describe('spearman', () => {
  it('perfect monotonic = 1, inverse = -1, ties and degenerate handled', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1)
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1)
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull()
    expect(spearman([1, 2], [1, 2])).toBeNull()
  })
})
