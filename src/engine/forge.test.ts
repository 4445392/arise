import { describe, expect, it } from 'vitest'
import { SKILLS } from '../content/skills'
import { DEFAULT_RUNGS } from '../content/forge'
import {
  assignJob, buildLadder, canBuy, courageLevel, earnedTitles, essenceOf, examPassed, initialScreenTarget, initialSteps, initialTrio,
  nextScreenTarget, nextSteps, nextTrio, pickNextSkill, rankExam, skillRank, SHOP, titleStatMult, titleXpMult, toSets, type ExamCtx, type TitleCtx,
} from './forge'
import { STAT_KEYS, type StatKey } from './types'

const stats = (v: Partial<Record<StatKey, number>> = {}) => Object.fromEntries(STAT_KEYS.map((k) => [k, v[k] ?? 10])) as Record<StatKey, number>

describe('Daily Trio, steps, screen time', () => {
  it('starts at 50 % of max (min 5) and splits into sets of <= 25', () => {
    expect(initialTrio(30)).toBe(15)
    expect(initialTrio(4)).toBe(5)
    expect(toSets(60)).toEqual([25, 25, 10])
    expect(toSets(0)).toEqual([])
  })
  it('+10 % per week (min +2), cap 100, same trust rule', () => {
    expect(nextTrio(10, 'advance')).toBe(12)
    expect(nextTrio(40, 'advance')).toBe(44)
    expect(nextTrio(98, 'advance')).toBe(100)
    expect(nextTrio(40, 'hold')).toBe(40)
    expect(nextTrio(40, 'step_back')).toBe(36)
  })
  it('steps: baseline + 1,000, +500 a week, cap 10,000', () => {
    expect(initialSteps(4000)).toBe(5000)
    expect(nextSteps(9800, 'advance')).toBe(10_000)
    expect(nextSteps(5000, 'step_back')).toBe(4500)
  })
  it('screen target: baseline -10 %, -10 % per kept week, floor 2 h', () => {
    expect(initialScreenTarget(300)).toBe(270)
    expect(nextScreenTarget(270, 300, 'advance')).toBe(243)
    expect(nextScreenTarget(125, 300, 'advance')).toBe(120)
    expect(nextScreenTarget(120, 300, 'advance')).toBe(120)
    expect(nextScreenTarget(250, 300, 'step_back')).toBe(275)
    expect(initialScreenTarget(100)).toBe(120)
  })
})

describe('skills', () => {
  it('14 skills, each with a Boss Test, checkpoints and resources; Markets is demo-only', () => {
    expect(SKILLS).toHaveLength(14)
    for (const s of SKILLS) {
      expect(s.bossTest.length).toBeGreaterThan(5)
      expect(s.checkpoints).toHaveLength(4)
      expect(s.resources.length).toBeGreaterThan(0)
      for (const r of s.resources) expect(r.url || r.search).toBeTruthy()
    }
    expect(SKILLS.find((s) => s.id === 'markets')!.note).toMatch(/Demo account only/)
    expect(JSON.stringify(SKILLS)).not.toMatch(/lottery|get rich quick|bet on/i)
  })
  it('skill ranks by hours; S needs external proof', () => {
    expect([0, 19, 20, 100, 300, 1000, 3000].map((h) => skillRank(h))).toEqual(['E', 'E', 'D', 'C', 'B', 'A', 'A'])
    expect(skillRank(3000, true)).toBe('S')
  })
  it('the System picks the skill that trains the weakest stat among the next 3', () => {
    expect(pickNextSkill([], stats({ INT: 30, NRV: 10, SEN: 30 }))!.id).toBe('speaking')
    expect(pickNextSkill([], stats({ INT: 5 }))!.id).toBe('learning')
    expect(pickNextSkill(['learning'], stats({ NRV: 50, SEN: 12, INT: 50 }))!.id).toBe('negotiation')
    expect(pickNextSkill(SKILLS.map((s) => s.id), stats())).toBeNull()
  })
})

describe('courage ladder', () => {
  const at = (rung: number, after: number, n: number) => Array.from({ length: n }, () => ({ rung, fearBefore: 80, fearAfter: after }))
  it('advances after 5 attempts with after-fear < 40', () => {
    expect(courageLevel([])).toBe(1)
    expect(courageLevel(at(1, 39, 4))).toBe(1)
    expect(courageLevel(at(1, 39, 5))).toBe(2)
    expect(courageLevel(at(1, 40, 9))).toBe(1)
    expect(courageLevel([...at(1, 20, 5), ...at(2, 20, 5)])).toBe(3)
    expect(courageLevel([...at(2, 20, 5)])).toBe(1)
  })
  it('merges personal fears with defaults by rating, easiest first, 10 rungs', () => {
    const l = buildLadder(DEFAULT_RUNGS, [{ label: 'Text my crush', rating: 95 }, { label: 'Say hi to a neighbour', rating: 5 }])
    expect(l).toHaveLength(10)
    expect(l[0]).toBe('Say hi to a neighbour')
    expect(l).toContain('Text my crush')
    expect(buildLadder(DEFAULT_RUNGS, [])).toEqual(DEFAULT_RUNGS)
  })
})

describe('jobs, titles, shop', () => {
  it('job comes from the top stat pair', () => {
    expect(assignJob(stats({ FOC: 40, WIL: 35 })).id).toBe('Monk')
    expect(assignJob(stats({ SEN: 50, LCK: 40, INT: 20 })).id).toBe('Merchant')
  })
  const t0: TitleCtx = { onTimeAwakenStreak: 0, trust30: 50, shadows: 0, trioAt100: false, screenUnderDays: 0, libraryBooks: 0, mainQuestGold: 0, puzzleGain: 0, reentries30: 0, decoded: 0 }
  it('all ten titles have a working condition', () => {
    expect(earnedTitles(t0)).toEqual([])
    expect(earnedTitles({ onTimeAwakenStreak: 14, trust30: 90, shadows: 10, trioAt100: true, screenUnderDays: 7, libraryBooks: 5, mainQuestGold: 1000, puzzleGain: 200, reentries30: 10, decoded: 50 })).toHaveLength(10)
  })
  it('title bonuses', () => {
    expect(titleXpMult('promises')).toBeCloseTo(1.05)
    expect(titleXpMult('iron')).toBe(1)
    expect(titleStatMult('iron', 'STR')).toBeCloseTo(1.1)
    expect(titleStatMult('iron', 'INT')).toBe(1)
    expect(titleXpMult(null)).toBe(1)
  })
  it('shop: prices from the spec, rank-gated, nothing buys out the Daily Quest', () => {
    expect(SHOP.find((s) => s.id === 'gaming')!.price).toBe(150)
    expect(SHOP.find((s) => s.id === 'gear')!.price).toBe(2000)
    expect(essenceOf(10_000, 400)).toBe(600)
    expect(canBuy(SHOP.find((s) => s.id === 'gear')!, 5000, 'E')).toBe(false)
    expect(canBuy(SHOP.find((s) => s.id === 'gear')!, 5000, 'D')).toBe(true)
    expect(JSON.stringify(SHOP)).not.toMatch(/skip|quest|penalty/i)
  })
})

describe('rank exams', () => {
  const c: ExamCtx = { completeDaysLast30: 25, trust30: 80, decoded: 25, shadows: 5, skillGatesCleared: 1, firstBossCleared: true, mainQuestChaptersCleared: 2, mainQuestIComplete: false, courageLevel: 1, libraryBooks: 0, goldBestMonth: 0 }
  it('D-Rank needs all six criteria', () => {
    expect(rankExam('D', c)).toHaveLength(6)
    expect(examPassed('D', c)).toBe(true)
    expect(examPassed('D', { ...c, completeDaysLast30: 24 })).toBe(false)
    expect(examPassed('D', { ...c, trust30: 79.9 })).toBe(false)
    expect(examPassed('D', { ...c, shadows: 4 })).toBe(false)
  })
  it('C-Rank needs all six criteria', () => {
    const cc = { ...c, skillGatesCleared: 3, shadows: 20, mainQuestIComplete: true, decoded: 50, courageLevel: 6, libraryBooks: 6 }
    expect(examPassed('C', cc)).toBe(true)
    expect(examPassed('C', { ...cc, courageLevel: 5 })).toBe(false)
    expect(examPassed('C', { ...cc, libraryBooks: 5 })).toBe(false)
  })
  it('B and above are drafts but still gated on real proof', () => {
    expect(examPassed('B', c)).toBe(false)
    expect(rankExam('S', c).length).toBeGreaterThan(3)
  })
})
