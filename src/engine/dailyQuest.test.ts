import { describe, expect, it } from 'vitest'
import { DAILY_CAP_MIN, RAMP_TOTALS, generateDailyQuest, scoreDay, type QuestInput } from './dailyQuest'
import { isObjectiveDone } from './xp'
import type { ProgressMap, QuestSpec } from './types'

// 2026-11-04 is a Wednesday (gym day). 05 Thu (gym), 06 Fri, 07 Sat (gym), 08 Sun, 09 Mon (gym), 10 Tue.
const base = (over: Partial<QuestInput> = {}): QuestInput => ({
  mode: 'BREAK',
  dayKey: '2026-11-10', // Tuesday, non-gym
  gymDays: [1, 3, 4, 6],
  rampWeek: 4,
  ...over,
})
const ids = (q: QuestSpec) => q.objectives.map((o) => o.id)

describe('BREAK mode', () => {
  it('week 4+ is exactly 240 minutes with 10 objectives on a weekday', () => {
    const q = generateDailyQuest(base({ dayKey: '2026-11-11' }))
    expect(q.totalMinutes).toBe(240)
    expect(q.objectives).toHaveLength(10)
  })
  it('Awakening Ramp totals match the spec for every week (gym day)', () => {
    const totals = [1, 2, 3, 4].map((w) => generateDailyQuest(base({ dayKey: '2026-11-11', rampWeek: w })).totalMinutes)
    expect(totals).toEqual([...RAMP_TOTALS])
  })
  it('never exceeds the 240-minute cap, even with absurd inputs', () => {
    for (let w = 1; w <= 4; w++) for (let d = 0; d < 7; d++) {
      const q = generateDailyQuest(base({ dayKey: `2026-11-${String(8 + d).padStart(2, '0')}`, rampWeek: w }))
      expect(q.totalMinutes).toBeLessThanOrEqual(DAILY_CAP_MIN)
    }
  })
  it('gym day body is the gym session; non-gym is Daily Trio', () => {
    const gym = generateDailyQuest(base({ dayKey: '2026-11-11' })).objectives.find((o) => o.id === 'BODY')!
    const rest = generateDailyQuest(base({ dayKey: '2026-11-10' })).objectives.find((o) => o.id === 'BODY')!
    expect(gym.title).toMatch(/Gym/)
    expect(rest.title).toMatch(/Trio/)
  })
  it('Sunday is rest & review (~90 min, four objectives, no Dungeon)', () => {
    const q = generateDailyQuest(base({ dayKey: '2026-11-08' }))
    expect(q.isSunday).toBe(true)
    expect(ids(q)).toEqual(['AWAKEN', 'RECOVERY', 'LIBRARY', 'GUILD_REPORT'])
    expect(q.totalMinutes).toBeLessThanOrEqual(90)
  })
  it('Sunday is never a gym day even if configured', () => {
    expect(generateDailyQuest(base({ dayKey: '2026-11-08', gymDays: [0, 1] })).isGymDay).toBe(false)
  })
  it('recovery mode halves the load and issues no penalty', () => {
    const q = generateDailyQuest(base({ dayKey: '2026-11-11', recovery: true, penalty: { hpLow: false } }))
    expect(q.penalty).toBeNull()
    expect(q.totalMinutes).toBeLessThanOrEqual(130)
    expect(q.loadFactor).toBe(0.5)
  })
  it('low HP swaps Body for mobility + walk', () => {
    const q = generateDailyQuest(base({ dayKey: '2026-11-11', hpRecovery: true }))
    expect(q.objectives.find((o) => o.id === 'BODY')!.title).toMatch(/Recovery Protocol/)
    expect(q.notices.join(' ')).toMatch(/RECOVERY PROTOCOL/)
  })
  it('a pending penalty is issued as its own quest (20 min Dragon / 30 min walk)', () => {
    expect(generateDailyQuest(base({ penalty: { hpLow: false, dragon: 'Statistics' } })).penalty!.minutes).toBe(20)
    expect(generateDailyQuest(base({ penalty: { hpLow: true } })).penalty!.minutes).toBe(30)
  })
  it('Courage, Strategy, Skill Gate and Main Quest are present (unlocked)', () => {
    const q = generateDailyQuest(base())
    for (const id of ['COURAGE', 'STRATEGY', 'SKILL_GATE', 'MAIN_QUEST']) expect(ids(q)).toContain(id)
    expect(q.locked).toHaveLength(0)
  })
})

describe('SEMESTER mode', () => {
  it('Mon/Wed/Fri = coursework, Tue/Thu/Sat = Main Quest; skill 20 / library 15', () => {
    const mon = generateDailyQuest(base({ mode: 'SEMESTER', dayKey: '2026-11-09' }))
    const tue = generateDailyQuest(base({ mode: 'SEMESTER', dayKey: '2026-11-10' }))
    expect(ids(mon)).toContain('COURSEWORK')
    expect(ids(tue)).toContain('MAIN_QUEST')
    expect(mon.objectives.find((o) => o.id === 'SKILL_GATE')!.minutes).toBe(20)
    expect(mon.objectives.find((o) => o.id === 'LIBRARY')!.minutes).toBe(15)
    expect(mon.totalMinutes).toBeLessThan(240)
  })
})

describe('EXAM mode', () => {
  const exam = (over: Partial<QuestInput> = {}) => generateDailyQuest(base({ mode: 'EXAM', studyTargetMin: 120, ...over }))
  it('has the six objectives and locks Courage/Strategy/Skill/Main Quest', () => {
    const q = exam({ dayKey: '2026-11-10' })
    expect(ids(q)).toEqual(['AWAKEN', 'BODY', 'DUNGEONS', 'TEACH_BACK', 'LIBRARY', 'SHUTDOWN'])
    expect(q.locked.map((l) => l.id).sort()).toEqual(['COURAGE', 'MAIN_QUEST', 'SKILL_GATE', 'STRATEGY'])
    expect(q.locked[0].reason).toBe('LOCKED — after the final boss')
  })
  it('keeps new habits small: everything except study is under 90 min', () => {
    const q = exam({ dayKey: '2026-11-11' })
    const nonStudy = q.objectives.filter((o) => o.id !== 'DUNGEONS').reduce((s, o) => s + o.minutes, 0)
    expect(nonStudy).toBeLessThanOrEqual(90)
  })
  it('gym day vs non-gym day Body', () => {
    expect(exam({ dayKey: '2026-11-11' }).objectives[1].title).toMatch(/Gym/)
    expect(exam({ dayKey: '2026-11-10' }).objectives[1].items!.map((i) => i.id)).toEqual(['push', 'squat', 'sit', 'walk'])
  })
  it('Dungeon target comes from the study plan', () => {
    expect(exam({ studyTargetMin: 90 }).objectives.find((o) => o.id === 'DUNGEONS')!.target).toBe(90)
  })
  it('adds a Pre-Boss Ritual the night before and the morning of an exam', () => {
    const e = [{ id: 'e1', subject: 'Statistics', dateKey: '2026-11-12' }]
    expect(ids(exam({ dayKey: '2026-11-11', exams: e }))).toContain('RITUAL')
    expect(ids(exam({ dayKey: '2026-11-12', exams: e }))).toContain('RITUAL')
    expect(ids(exam({ dayKey: '2026-11-10', exams: e }))).not.toContain('RITUAL')
    expect(ids(exam({ dayKey: '2026-11-13', exams: e }))).not.toContain('RITUAL')
  })
  it('Sunday swaps Body for Active Recovery', () => {
    expect(ids(exam({ dayKey: '2026-11-08' }))).toContain('RECOVERY')
  })
})

describe('scoreDay', () => {
  const q = generateDailyQuest(base({ mode: 'EXAM', dayKey: '2026-11-10', studyTargetMin: 60 }))
  const doneAll = (): ProgressMap => {
    const p: ProgressMap = {}
    for (const o of q.objectives) p[o.key] = o.kind === 'checklist' ? { items: o.items!.map((i) => i.id), value: 0 } : { items: [], value: o.target! }
    return p
  }
  it('all objectives = COMPLETE', () => {
    expect(scoreDay(q, doneAll()).outcome).toBe('COMPLETE')
  })
  it('>= 70 % = PARTIAL, < 70 % = FAILED', () => {
    const p = doneAll()
    delete p.TEACH_BACK // 5/6 = 83 %
    expect(scoreDay(q, p).outcome).toBe('PARTIAL')
    delete p.LIBRARY
    delete p.SHUTDOWN // 3/6 = 50 %
    expect(scoreDay(q, p).outcome).toBe('FAILED')
  })
  it('an uncleared penalty fails the day even at 100 %', () => {
    const qp = generateDailyQuest(base({ mode: 'EXAM', dayKey: '2026-11-10', studyTargetMin: 60, penalty: { hpLow: false } }))
    const p: ProgressMap = {}
    for (const o of qp.objectives) p[o.key] = o.kind === 'checklist' ? { items: o.items!.map((i) => i.id), value: 0 } : { items: [], value: o.target! }
    expect(scoreDay(qp, p).outcome).toBe('FAILED')
    p.PENALTY = { items: [], value: 20 }
    expect(scoreDay(qp, p).outcome).toBe('COMPLETE')
  })
  it('a declared swap counts as kept', () => {
    const p = doneAll()
    p.LIBRARY = { items: [], value: 0, swapped: true }
    expect(isObjectiveDone(q.objectives.find((o) => o.id === 'LIBRARY')!, p.LIBRARY)).toBe(true)
  })
})
