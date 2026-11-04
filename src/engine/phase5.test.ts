import { describe, expect, it } from 'vitest'
import { shadowName, shadowRank } from './shadows'
import { hiddenForDay, hiddenSchedule, weekKey } from './hidden'
import { backupDue, buildReport, weeklyFocusStat, type ReportInput } from './report'
import { buildIcs } from './ics'
import { diffDays } from './day'
import { STAT_KEYS, type StatKey } from './types'

const stats = (v: Partial<Record<StatKey, number>> = {}) => Object.fromEntries(STAT_KEYS.map((k) => [k, v[k] ?? 10])) as Record<StatKey, number>

describe('shadows', () => {
  it('names are "Shadow of" + at most 4 words', () => {
    expect(shadowName("I'll look stupid in front of everyone in class")).toBe('Shadow of Look stupid in front')
    expect(shadowName('that they think I am boring')).toBe('Shadow of Think I am boring')
    expect(shadowName('')).toBe('Shadow of The unknown')
  })
  it('rank follows severity', () => {
    expect([1, 3, 5, 7, 9, 10].map(shadowRank)).toEqual(['E', 'D', 'C', 'B', 'A', 'S'])
  })
})

describe('hidden quests', () => {
  it('week key is Monday', () => {
    expect(weekKey('2026-11-04')).toBe('2026-11-02')
    expect(weekKey('2026-11-08')).toBe('2026-11-02') // Sunday belongs to the week that began Monday
    expect(weekKey('2026-11-09')).toBe('2026-11-09')
  })
  it('1-2 per week, distinct, Mon-Sat, deterministic', () => {
    for (const w of ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']) {
      const s = hiddenSchedule(w)
      expect(s.length).toBeGreaterThanOrEqual(1)
      expect(s.length).toBeLessThanOrEqual(2)
      expect(new Set(s.map((x) => x.quest.id)).size).toBe(s.length)
      expect(hiddenSchedule(w)).toEqual(s)
    }
  })
  it('locked below Lv3', () => {
    expect(hiddenForDay('2026-11-08', 2)).toEqual([])
  })
  it('all of the week eventually appears by Saturday', () => {
    const n = hiddenSchedule('2026-11-02').length
    expect(hiddenForDay('2026-11-07', 5)).toHaveLength(n)
  })
})

const input = (): ReportInput => ({
  name: 'Sfundo',
  weekStart: '2026-11-02',
  weekEnd: '2026-11-08',
  level: 5,
  rank: 'E',
  xpWeek: 1400,
  statsBefore: stats(),
  statsAfter: stats({ INT: 12, WIL: 11 }),
  trust7: 88,
  trust30: 80,
  outcomes: { complete: 4, partial: 2, failed: 1 },
  byObjective: { AWAKEN: { kept: 6, total: 7 }, BODY: { kept: 5, total: 7 } },
  deepWorkMin: 600,
  screenAvgMin: 250,
  drifts: { phone: 4, tired: 1 },
  fearLine: 'You predicted disaster 3 times. It happened 0 times.',
  focusStat: 'ORD',
  newInsights: ['Energy peaks 09:00–11:00.'],
})

describe('guild report', () => {
  it('focus stat is the weakest', () => {
    expect(weeklyFocusStat(stats({ STR: 15, ORD: 9 }))).toBe('ORD')
    expect(weeklyFocusStat(stats())).toBe('STR')
  })
  it('is plain text and within 400 words', () => {
    const t = buildReport(input())
    expect(t).toContain('TRUST: 7-day 88%')
    expect(t).toContain('INT 10→12')
    expect(t).toContain('Focus Stat: ORD')
    expect(t.split(/\s+/).length).toBeLessThanOrEqual(400)
  })
  it('truncates a monstrous report to 400 words', () => {
    const big = input()
    big.newInsights = Array.from({ length: 500 }, (_, i) => `word${i}`)
    expect(buildReport(big).split(/\s+/).length).toBeLessThanOrEqual(400)
  })
  it('backup reminder: Sundays and after a week', () => {
    expect(backupDue(null, '2026-11-08', true, diffDays)).toBe(true)
    expect(backupDue('2026-11-08', '2026-11-08', true, diffDays)).toBe(false)
    expect(backupDue('2026-11-01', '2026-11-08', true, diffDays)).toBe(true)
    expect(backupDue('2026-11-05', '2026-11-06', false, diffDays)).toBe(false)
    expect(backupDue('2026-10-20', '2026-11-06', false, diffDays)).toBe(true)
  })
})

describe('.ics export', () => {
  const ics = buildIcs({ startDay: '2026-11-05', wakeWeekday: '08:00', wakeWeekend: '09:00', lightsOut: '00:00', focusStart: '09:00', focusEnd: '12:00' })
  it('is a valid-looking calendar with CRLF line endings and 5 events with alarms', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(5)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(5)
    expect(ics.replace(/\r\n/g, '').includes('\n')).toBe(false)
  })
  it('wake, focus, shutdown and Sunday report are present', () => {
    expect(ics).toContain('DTSTART;TZID=Africa/Johannesburg:20261105T080000')
    expect(ics).toContain('BYDAY=MO,TU,WE,TH,FR')
    expect(ics).toContain('SUMMARY:ARISE: Peak focus window')
    expect(ics).toContain('DTSTART;TZID=Africa/Johannesburg:20261104T233000') // 30 min before midnight lights-out, previous date
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU')
  })
  it('no line is longer than 75 characters', () => {
    for (const l of ics.split('\r\n')) expect(l.length).toBeLessThanOrEqual(75)
  })
})
