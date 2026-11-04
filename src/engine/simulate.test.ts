import { describe, expect, it } from 'vitest'
import { dayReached, simulate } from './simulate'
import { STAT_KEYS } from './types'

describe('4-year simulation at 85 % completion (spec 5.2 targets, within +/-15 %)', () => {
  const sim = simulate({ days: 1500, completion: 0.85, seed: 7 })
  const targets: [level: number, day: number][] = [
    [10, 30],
    [25, 120],
    [45, 365],
    [65, 730],
    [85, 1095],
    [100, 1460],
  ]
  for (const [level, day] of targets) {
    it(`Lv${level} arrives near day ${day}`, () => {
      const hit = dayReached(sim, level)
      expect(hit).not.toBeNull()
      expect(hit!).toBeGreaterThanOrEqual(day * 0.85)
      expect(hit!).toBeLessThanOrEqual(day * 1.15)
    })
  }
  it('is robust to the random seed', () => {
    for (const seed of [1, 2, 3]) {
      const s = simulate({ days: 400, completion: 0.85, seed })
      const d45 = dayReached(s, 45)!
      expect(d45).toBeGreaterThanOrEqual(365 * 0.85)
      expect(d45).toBeLessThanOrEqual(365 * 1.15)
    }
  })
  it('level never decreases and rank gates never block the sim permanently', () => {
    for (let i = 1; i < sim.length; i++) expect(sim[i].level).toBeGreaterThanOrEqual(sim[i - 1].level)
    expect(sim[sim.length - 1].rank).toBe('ELITE')
  })
  it('the Awakening Ramp reaches full load by week 4+ at 85 % completion', () => {
    expect(sim[27].rampWeek).toBe(4)
  })
  it('stats: the average stat is ~50 after 12 months of full protocol', () => {
    const at = sim[364].stats
    const mean = STAT_KEYS.reduce((s, k) => s + at[k], 0) / STAT_KEYS.length
    expect(mean).toBeGreaterThan(42)
    expect(mean).toBeLessThan(58)
  })
})

describe('early pacing (EXAM mode)', () => {
  const ex = simulate({ days: 25, completion: 0.85, seed: 7, mode: 'EXAM' })
  it('Lv2 arrives within the first two days', () => {
    expect(dayReached(ex, 2)!).toBeLessThanOrEqual(2)
  })
  it('Lv5 arrives within about ten days', () => {
    expect(dayReached(ex, 5)!).toBeLessThanOrEqual(10)
  })
})

describe('a worse Player still progresses, just slower', () => {
  it('50 % completion reaches fewer levels in a year than 85 %', () => {
    const a = simulate({ days: 365, completion: 0.5, seed: 9 })
    const b = simulate({ days: 365, completion: 0.85, seed: 9 })
    expect(a[364].level).toBeLessThan(b[364].level)
    expect(a[364].level).toBeGreaterThan(10)
  })
})
