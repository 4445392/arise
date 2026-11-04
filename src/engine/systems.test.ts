import { describe, expect, it } from 'vitest'
import { nextRampWeek, rampDecision, stepTarget, trustPct } from './trust'
import { INITIAL_PENALTY_STATE, advancePenaltyState, classifyDay, isRecoveryDay, penaltyQuest } from './penalties'
import {
  fatigueStep,
  hpFromSleep,
  lowMoodLoadActive,
  lowMoodTriggered,
  mpFrom,
  needsDeload,
  needsRecovery,
  vitalsFrom,
} from './vitals'
import { calibration, checkBacksDue, disasterLine, type FearRec } from './fear'
import { checkUnlock } from './unlocks'
import { costToRaise, dayStatXp, objectiveStatXp, statLevel, statProgress, statXpForLevel } from './stats'
import { createRng } from './rng'

describe('TRUST and ramp', () => {
  const days = [
    { dayKey: '2026-11-01', kept: 5, total: 10 },
    { dayKey: '2026-11-08', kept: 9, total: 10 },
    { dayKey: '2026-11-09', kept: 10, total: 10 },
  ]
  it('windows by day and ignores days outside', () => {
    expect(trustPct(days, '2026-11-09', 7)).toBeCloseTo(95)
    expect(trustPct(days, '2026-11-09', 30)).toBeCloseTo(80)
    expect(trustPct([], '2026-11-09', 7)).toBeNull()
  })
  it('advance >= 85, hold 70-85, step back < 70', () => {
    expect(rampDecision(85)).toBe('advance')
    expect(rampDecision(84.9)).toBe('hold')
    expect(rampDecision(70)).toBe('hold')
    expect(rampDecision(69.9)).toBe('step_back')
    expect(rampDecision(null)).toBe('hold')
  })
  it('ramp week moves one column and clamps to 1..4', () => {
    expect(nextRampWeek(1, 'advance')).toBe(2)
    expect(nextRampWeek(4, 'advance')).toBe(4)
    expect(nextRampWeek(1, 'step_back')).toBe(1)
    expect(nextRampWeek(3, 'step_back')).toBe(2)
    expect(nextRampWeek(3, 'hold')).toBe(3)
  })
  it('numeric targets follow the same rule', () => {
    expect(stepTarget(5000, 'advance', 500, 3000, 10000)).toBe(5500)
    expect(stepTarget(10000, 'advance', 500, 3000, 10000)).toBe(10000)
    expect(stepTarget(5000, 'step_back', 500, 3000, 10000)).toBe(4500)
  })
})

describe('penalty -> recovery transitions', () => {
  it('classifies days', () => {
    expect(classifyDay(100, true)).toBe('COMPLETE')
    expect(classifyDay(70, false)).toBe('PARTIAL')
    expect(classifyDay(69, false)).toBe('FAILED')
  })
  it('one FAILED day -> Penalty Quest tomorrow', () => {
    const s = advancePenaltyState(INITIAL_PENALTY_STATE, 'FAILED', false)
    expect(s.penaltyPending).toBe(true)
    expect(s.recoveryDaysLeft).toBe(0)
  })
  it('PARTIAL / COMPLETE clear the pending penalty and the fail streak', () => {
    const failed = advancePenaltyState(INITIAL_PENALTY_STATE, 'FAILED', false)
    expect(advancePenaltyState(failed, 'PARTIAL', false)).toEqual(INITIAL_PENALTY_STATE)
    expect(advancePenaltyState(failed, 'COMPLETE', false)).toEqual(INITIAL_PENALTY_STATE)
  })
  it('two FAILED days in a row -> 3 days of Recovery Mode and no penalty', () => {
    let s = advancePenaltyState(INITIAL_PENALTY_STATE, 'FAILED', false)
    s = advancePenaltyState(s, 'FAILED', false)
    expect(s.recoveryDaysLeft).toBe(3)
    expect(s.penaltyPending).toBe(false)
    expect(isRecoveryDay(s)).toBe(true)
  })
  it('recovery counts down 3 -> 0 and then normal rules resume; failures during recovery are not punished', () => {
    let s = { consecutiveFails: 0, penaltyPending: false, recoveryDaysLeft: 3 }
    s = advancePenaltyState(s, 'FAILED', true)
    expect(s.recoveryDaysLeft).toBe(2)
    expect(s.penaltyPending).toBe(false)
    s = advancePenaltyState(s, 'COMPLETE', true)
    s = advancePenaltyState(s, 'PARTIAL', true)
    expect(s.recoveryDaysLeft).toBe(0)
    expect(isRecoveryDay(s)).toBe(false)
  })
  it('penalty copy is firm, not shaming', () => {
    expect(penaltyQuest({ hpLow: false, dragon: 'Statistics' }).desc).toContain('Statistics')
    expect(penaltyQuest({ hpLow: true }).title).toMatch(/Walk/)
    expect(JSON.stringify(penaltyQuest({ hpLow: false }))).not.toMatch(/weak|lazy|pathetic/i)
  })
})

describe('vitals', () => {
  it('HP rises with sleep and quality', () => {
    expect(hpFromSleep(8, 5)).toBe(100)
    expect(hpFromSleep(4.5, 1)).toBeLessThan(40)
    expect(hpFromSleep(7, 4)).toBeGreaterThan(hpFromSleep(7, 2))
    expect(hpFromSleep(9, 3)).toBeLessThan(hpFromSleep(9, 5))
  })
  it('MP from energy + mood', () => {
    expect(mpFrom(5, 5)).toBe(100)
    expect(mpFrom(1, 1)).toBe(0)
  })
  it('recovery protocol triggers strictly below 40 % HP', () => {
    expect(needsRecovery(39)).toBe(true)
    expect(needsRecovery(40)).toBe(false)
    const v = vitalsFrom({ sleepHours: 4, sleepQuality: 1, energy: 2, mood: 3, pain: false })
    expect(needsRecovery(v.hp)).toBe(true)
  })
  it('fatigue builds on full days at low HP and triggers a deload at 3', () => {
    let f = 0
    f = fatigueStep(f, 50, true)
    f = fatigueStep(f, 50, true)
    expect(needsDeload(f)).toBe(false)
    f = fatigueStep(f, 55, true)
    expect(needsDeload(f)).toBe(true)
    expect(fatigueStep(f, 80, true)).toBe(2)
    expect(fatigueStep(1, 40, false)).toBe(0)
  })
  it('mood <= 2 on 5 of 7 days triggers support; 4 of 7 does not', () => {
    const mk = (n: number) => Array.from({ length: 7 }, (_, i) => ({ dayKey: `2026-11-0${i + 1}`, mood: i < n ? 2 : 4 }))
    expect(lowMoodTriggered(mk(5), '2026-11-07')).toBe(true)
    expect(lowMoodTriggered(mk(4), '2026-11-07')).toBe(false)
  })
  it('load reduction stays active for 3 days after the trigger, then stops', () => {
    const lows = Array.from({ length: 5 }, (_, i) => ({ dayKey: `2026-11-0${i + 1}`, mood: 1 }))
    expect(lowMoodLoadActive(lows, '2026-11-05')).toBe(true)
    expect(lowMoodLoadActive(lows, '2026-11-07')).toBe(true)
    expect(lowMoodLoadActive(lows, '2026-11-09')).toBe(true) // condition held through day 7, +2 days of care
    expect(lowMoodLoadActive(lows, '2026-11-10')).toBe(false)
  })
})

describe('fear calibration', () => {
  const fears: FearRec[] = [
    { id: 1, predicted: 80, severity: 7, outcome: 'no' },
    { id: 2, predicted: 60, severity: 5, outcome: 'no' },
    { id: 3, predicted: 70, severity: 6, outcome: 'true' },
    { id: 4, predicted: 40, severity: 3, outcome: 'better' },
    { id: 5, predicted: 90, severity: 9, outcome: 'partly' },
    { id: 6, predicted: 50, severity: 4, outcome: null },
  ]
  it('counts resolved outcomes and averages predictions', () => {
    const c = calibration(fears)
    expect(c.logged).toBe(6)
    expect(c.resolved).toBe(5)
    expect(c.cameTrue).toBe(1)
    expect(c.pctTrue).toBeCloseTo(20)
    expect(c.avgPredicted).toBeCloseTo(68)
  })
  it('predicted-vs-actual buckets', () => {
    const b = calibration(fears).buckets.find((x) => x.label === '81-100')!
    expect(b.n).toBe(1)
    expect(b.actual).toBe(50) // "partly" counts half
  })
  it('the disaster line', () => {
    expect(disasterLine(fears)).toBe('You predicted disaster 5 times. It happened 1 time.')
  })
  it('empty data is safe', () => {
    const c = calibration([])
    expect(c.pctTrue).toBeNull()
    expect(c.avgPredicted).toBeNull()
  })
  it('check-backs due', () => {
    const f = [
      { checkBack: '2026-11-05', outcome: null },
      { checkBack: '2026-11-10', outcome: null },
      { checkBack: '2026-11-01', outcome: 'no' as const },
    ]
    expect(checkBacksDue(f, '2026-11-06')).toHaveLength(1)
  })
})

describe('unlocks', () => {
  const s = (level: number, mode: 'EXAM' | 'BREAK' = 'BREAK', rank: 'E' | 'D' = 'E') => ({ level, mode, rank })
  it('level gates', () => {
    expect(checkUnlock('shadowArmy', s(1))).toEqual({ locked: true, label: 'LOCKED — Lv.2' })
    expect(checkUnlock('shadowArmy', s(2)).locked).toBe(false)
    expect(checkUnlock('titles', s(7)).locked).toBe(true)
    expect(checkUnlock('titles', s(8)).locked).toBe(false)
  })
  it('EXAM mode locks the Forge content', () => {
    for (const f of ['skillGates', 'courage', 'strategy', 'mainQuest'] as const) {
      expect(checkUnlock(f, s(50, 'EXAM'))).toEqual({ locked: true, label: 'LOCKED — after the final boss' })
      expect(checkUnlock(f, s(1, 'BREAK')).locked).toBe(false)
    }
  })
  it('D-Rank gates', () => {
    expect(checkUnlock('gates', s(9)).locked).toBe(true)
    expect(checkUnlock('gates', s(10, 'BREAK', 'D')).locked).toBe(false)
  })
  it('Lv1 core features are open in EXAM mode', () => {
    for (const f of ['status', 'dailyQuest', 'timer', 'pulses', 'journal', 'fearLog', 'guildReport'] as const) expect(checkUnlock(f, s(1, 'EXAM')).locked).toBe(false)
  })
})

describe('stats', () => {
  it('cost to raise n -> n+1 is 40 + 4(n - 10)', () => {
    expect(costToRaise(10)).toBe(40)
    expect(costToRaise(20)).toBe(80)
    expect(statXpForLevel(12)).toBe(40 + 44)
  })
  it('statLevel inverts the cost curve', () => {
    expect(statLevel(0)).toBe(10)
    expect(statLevel(39)).toBe(10)
    expect(statLevel(40)).toBe(11)
    expect(statLevel(statXpForLevel(30))).toBe(30)
    expect(statProgress(50).level).toBe(11)
  })
  it('an objective splits 10 stat-XP (x scale) across its tags', () => {
    const spec = { id: 'AWAKEN', key: 'AWAKEN', title: '', desc: '', minutes: 5, stats: ['WIL', 'VIT'], window: '', kind: 'checklist', items: [{ id: 'a', label: '' }] } as never
    const r = objectiveStatXp(spec)
    expect(r.WIL).toBeCloseTo(r.VIT)
    expect(r.WIL + r.VIT).toBeCloseTo(15)
    expect(objectiveStatXp(spec, { weeklyFocusStat: 'WIL' }).WIL).toBeCloseTo(r.WIL * 1.5)
  })
  it('scroll debuff cuts FOC stat-XP by 20 %', () => {
    const spec = { id: 'STILLNESS', key: 'STILLNESS', title: '', desc: '', minutes: 5, stats: ['FOC'], window: '', kind: 'timer', target: 5 } as never
    expect(objectiveStatXp(spec, { scrollDebuff: true }).FOC).toBeCloseTo(objectiveStatXp(spec).FOC * 0.8)
  })
  it('only completed objectives earn stat-XP', () => {
    const spec = { id: 'AWAKEN', key: 'AWAKEN', title: '', desc: '', minutes: 5, stats: ['WIL'], window: '', kind: 'checklist', items: [{ id: 'a', label: '' }] } as never
    expect(dayStatXp([spec], {}).WIL).toBe(0)
    expect(dayStatXp([spec], { AWAKEN: { items: ['a'], value: 0 } }).WIL).toBeGreaterThan(0)
  })
})

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)])
    expect(createRng(1).next()).not.toBe(createRng(2).next())
  })
})
