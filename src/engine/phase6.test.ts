import { describe, expect, it } from 'vitest'
import { IPIP_ITEMS } from '../content/ipip50'
import { scoreIpip } from './ipip'
import { buildManual, manualText, shouldAskMotive } from './manual'
import { computeInsights, type InsightInput } from './insights'

describe('IPIP-50', () => {
  it('has 50 items, 10 per factor, numbered 1-50', () => {
    expect(IPIP_ITEMS).toHaveLength(50)
    expect(IPIP_ITEMS.map((i) => i.n)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
    for (const f of ['E', 'A', 'C', 'N', 'O']) expect(IPIP_ITEMS.filter((i) => i.factor === f)).toHaveLength(10)
  })
  it('scoring honours reverse keys', () => {
    const keyed: Record<number, number> = Object.fromEntries(IPIP_ITEMS.map((i) => [i.n, i.key === 1 ? 5 : 1]))
    expect(scoreIpip(keyed)).toEqual({ E: 5, A: 5, C: 5, N: 5, O: 5 })
    const neutral: Record<number, number> = Object.fromEntries(IPIP_ITEMS.map((i) => [i.n, 3]))
    expect(scoreIpip(neutral)).toEqual({ E: 3, A: 3, C: 3, N: 3, O: 3 })
  })
  it('incomplete answers do not score', () => {
    expect(scoreIpip({ 1: 3 })).toBeNull()
  })
})

describe('motive tags and the Player Manual', () => {
  it('asks on roughly a third of completions, deterministically', () => {
    let n = 0
    for (let d = 1; d <= 300; d++) if (shouldAskMotive('AWAKEN', `2026-01-${d}`)) n++
    expect(n).toBeGreaterThan(70)
    expect(n).toBeLessThan(130)
    expect(shouldAskMotive('BODY', '2026-11-04')).toBe(shouldAskMotive('BODY', '2026-11-04'))
  })
  const empty: InsightInput = { pulses: [], ratings: [], drifts: [], motives: [], sessions: [], days: [], fears: [], audits: [], ipip: null, values: null, skills: [], level: 1 }
  it('every section says "not enough data" when locked', () => {
    const m = buildManual(computeInsights(empty))
    expect(m).toHaveLength(8)
    expect(m.every((s) => !s.unlocked)).toBe(true)
    expect(m[2].text).toContain('Not enough data yet')
  })
  it('unlocked chapters feed the manual text and export with sample size', () => {
    const motives = Array.from({ length: 20 }, (_, i) => ({ motive: i % 2 ? 'mastery' : 'money' }))
    const m = buildManual(computeInsights({ ...empty, motives }))
    expect(m[2].unlocked).toBe(true)
    expect(m[2].text).toContain('n=20')
    expect(manualText('Sfundo', m)).toMatch(/^HOW SFUNDO WORKS/)
  })
})
