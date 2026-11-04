import { describe, expect, it } from 'vitest'
import { bossRaidXp, dayXp, objectiveXp, rawLevel, resolveLevel, xpForLevel, EXAM_DUNGEON_DAILY_CAP } from './xp'
import { levelCap, rankForLevel } from './ranks'
import type { ObjectiveSpec } from './types'

const check = (minutes: number, stats: ObjectiveSpec['stats'] = ['WIL']): ObjectiveSpec => ({
  id: 'AWAKEN',
  key: 'AWAKEN',
  title: 'x',
  desc: '',
  minutes,
  stats,
  window: '',
  kind: 'checklist',
  items: [{ id: 'a', label: 'a' }],
})
const dungeon = (minutes: number): ObjectiveSpec => ({
  id: 'DUNGEONS',
  key: 'DUNGEONS',
  title: 'd',
  desc: '',
  minutes,
  stats: ['INT'],
  window: '',
  kind: 'timer',
  target: minutes,
  dungeon: true,
})

describe('ranks', () => {
  it('maps level to rank', () => {
    expect([1, 9, 10, 24, 25, 44, 45, 64, 65, 84, 85, 99, 100].map(rankForLevel)).toEqual(['E', 'E', 'D', 'D', 'C', 'C', 'B', 'B', 'A', 'A', 'S', 'S', 'ELITE'])
  })
  it('caps the level below the first unpassed rank', () => {
    expect(levelCap([])).toBe(9)
    expect(levelCap(['D'])).toBe(24)
    expect(levelCap(['D', 'C', 'B', 'A', 'S', 'ELITE'])).toBe(100)
  })
})

describe('level curve and rank gates', () => {
  it('is monotonic and starts at 0', () => {
    expect(xpForLevel(1)).toBe(0)
    for (let l = 2; l <= 100; l++) expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1))
  })
  it('rawLevel inverts xpForLevel', () => {
    for (const l of [2, 5, 10, 25, 50, 100]) expect(rawLevel(xpForLevel(l))).toBe(l)
    expect(rawLevel(xpForLevel(10) - 1)).toBe(9)
  })
  it('holds at Lv9 with RANK EXAM AVAILABLE and keeps banking XP', () => {
    const s = resolveLevel(xpForLevel(10) + 5000, [])
    expect(s.level).toBe(9)
    expect(s.capped).toBe(true)
    expect(s.examAvailable).toBe('D')
    expect(s.progress).toBe(1)
  })
  it('releases the banked XP once the exam is passed', () => {
    const s = resolveLevel(xpForLevel(12), ['D'])
    expect(s.level).toBe(12)
    expect(s.capped).toBe(false)
    expect(s.rank).toBe('D')
  })
  it('is not capped below the boundary', () => {
    const s = resolveLevel(xpForLevel(5) + 10, [])
    expect(s.level).toBe(5)
    expect(s.capped).toBe(false)
  })
})

describe('objective and day XP', () => {
  it('a done objective is worth its planned minutes; an undone one is worth 0', () => {
    expect(objectiveXp(check(5), { items: ['a'], value: 0 }, { mode: 'BREAK' })).toBe(5)
    expect(objectiveXp(check(5), { items: [], value: 0 }, { mode: 'BREAK' })).toBe(0)
  })
  it('dungeons pay logged minutes, capped at 2x planned', () => {
    expect(objectiveXp(dungeon(60), { items: [], value: 45 }, { mode: 'BREAK' })).toBe(45)
    expect(objectiveXp(dungeon(60), { items: [], value: 500 }, { mode: 'BREAK' })).toBe(120)
  })
  it('phone-away dungeon minutes are x1.25', () => {
    expect(objectiveXp(dungeon(60), { items: [], value: 60, awayMin: 60 }, { mode: 'BREAK' })).toBe(75)
  })
  it('weekly focus stat objectives are x1.5', () => {
    expect(objectiveXp(check(10, ['FOC']), { items: ['a'], value: 0 }, { mode: 'BREAK', weeklyFocusStat: 'FOC' })).toBe(15)
  })
  it('COMPLETE adds +25 %; PARTIAL does not', () => {
    const specs = [check(20)]
    const prog = { AWAKEN: { items: ['a'], value: 0 } }
    expect(dayXp(specs, prog, 'COMPLETE', { mode: 'BREAK' }).total).toBe(25)
    expect(dayXp(specs, prog, 'PARTIAL', { mode: 'BREAK' }).total).toBe(20)
  })
  it('EXAM mode caps Dungeon XP at 180 per day', () => {
    const d = dungeon(400)
    const r = dayXp([d], { DUNGEONS: { items: [], value: 800 } }, 'PARTIAL', { mode: 'EXAM' })
    expect(r.total).toBe(EXAM_DUNGEON_DAILY_CAP)
  })
  it('title multiplier applies to everything', () => {
    const prog = { AWAKEN: { items: ['a'], value: 0 } }
    expect(dayXp([check(100)], prog, 'PARTIAL', { mode: 'BREAK', titleMult: 1.05 }).total).toBe(105)
  })
  it('boss raid: show up + later result bonus; nothing if absent', () => {
    expect(bossRaidXp(true, false)).toBe(150)
    expect(bossRaidXp(true, true)).toBe(225)
    expect(bossRaidXp(false, true)).toBe(0)
  })
})
