import { describe, expect, it } from 'vitest'
import { addDays, clockTs, dayKey, deadlineTs, diffDays, isOnTime, sleepWindowMinutes, weekday } from './day'

const ts = (iso: string) => new Date(iso).getTime()

describe('day boundary (Africa/Johannesburg, 04:00 -> 03:59)', () => {
  it('23:59 belongs to that calendar day', () => {
    expect(dayKey(ts('2026-11-04T23:59:00+02:00'))).toBe('2026-11-04')
  })
  it('00:30 after midnight still belongs to the previous day', () => {
    expect(dayKey(ts('2026-11-05T00:30:00+02:00'))).toBe('2026-11-04')
  })
  it('03:59 still belongs to the previous day', () => {
    expect(dayKey(ts('2026-11-05T03:59:00+02:00'))).toBe('2026-11-04')
  })
  it('04:00 starts the new day', () => {
    expect(dayKey(ts('2026-11-05T04:00:00+02:00'))).toBe('2026-11-05')
  })
  it('handles month and year rollovers', () => {
    expect(dayKey(ts('2027-01-01T01:00:00+02:00'))).toBe('2026-12-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
  })
})

describe('helpers', () => {
  it('weekday / diffDays', () => {
    expect(weekday('2026-11-04')).toBe(3) // Wednesday
    expect(weekday('2026-11-08')).toBe(0) // Sunday
    expect(diffDays('2026-11-04', '2026-11-25')).toBe(21)
  })
  it('deadline: midnight lights-out is the end of the game day', () => {
    expect(deadlineTs('2026-11-04', '00:00')).toBe(ts('2026-11-05T00:00:00+02:00'))
    expect(clockTs('2026-11-04', '23:30')).toBe(ts('2026-11-04T23:30:00+02:00'))
  })
  it('on-time: before lights-out yes, after midnight (still same day) no bonus', () => {
    expect(isOnTime(ts('2026-11-04T23:59:00+02:00'), '2026-11-04', '00:00')).toBe(true)
    expect(isOnTime(ts('2026-11-05T00:30:00+02:00'), '2026-11-04', '00:00')).toBe(false)
  })
  it('sleep window wraps midnight', () => {
    expect(sleepWindowMinutes('00:00', '08:00')).toBe(480)
    expect(sleepWindowMinutes('23:00', '06:00')).toBe(420)
  })
})
