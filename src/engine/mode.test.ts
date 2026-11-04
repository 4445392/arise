import { describe, expect, it } from 'vitest'
import { modeForDay } from './mode'

const cfg = { lastExamDay: '2026-11-25', restartDay: '2027-02-01' }

describe('modeForDay', () => {
  it('EXAM through the last exam day, inclusive', () => {
    expect(modeForDay('2026-11-04', cfg)).toBe('EXAM')
    expect(modeForDay('2026-11-25', cfg)).toBe('EXAM')
  })
  it('BREAK from the day after the last exam to the day before restart', () => {
    expect(modeForDay('2026-11-26', cfg)).toBe('BREAK')
    expect(modeForDay('2027-01-31', cfg)).toBe('BREAK')
  })
  it('SEMESTER from restart', () => {
    expect(modeForDay('2027-02-01', cfg)).toBe('SEMESTER')
  })
  it('semester exam windows switch back to EXAM', () => {
    const c = { ...cfg, examWindows: [{ from: '2027-05-10', to: '2027-06-10' }] }
    expect(modeForDay('2027-05-09', c)).toBe('SEMESTER')
    expect(modeForDay('2027-05-10', c)).toBe('EXAM')
    expect(modeForDay('2027-06-11', c)).toBe('SEMESTER')
  })
})
