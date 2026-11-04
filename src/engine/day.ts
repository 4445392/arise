import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export const TZ = 'Africa/Johannesburg'
const HOUR = 3_600_000
/** The game day runs 04:00 -> 03:59 local. */
export const DAY_START_HOUR = 4

/** The game-day key (YYYY-MM-DD) that a timestamp belongs to. */
export function dayKey(ts: number, tz: string = TZ): string {
  return formatInTimeZone(ts - DAY_START_HOUR * HOUR, tz, 'yyyy-MM-dd')
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay()
}

export function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

export function dayStartTs(key: string, tz: string = TZ): number {
  return fromZonedTime(`${key}T0${DAY_START_HOUR}:00:00`, tz).getTime()
}

/** Local clock hour (0-23) of a timestamp. */
export function hourOf(ts: number, tz: string = TZ): number {
  return Number(formatInTimeZone(ts, tz, 'H'))
}

/** Local minutes since midnight. */
export function minuteOfClock(ts: number, tz: string = TZ): number {
  const [h, m] = formatInTimeZone(ts, tz, 'HH:mm').split(':').map(Number)
  return h * 60 + m
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Timestamp of a clock time ("HH:MM") that belongs to a game day. Times before 04:00 fall on the next calendar date. */
export function clockTs(key: string, hhmm: string, tz: string = TZ): number {
  const [h, m] = hhmm.split(':').map(Number)
  const calendar = h < DAY_START_HOUR ? addDays(key, 1) : key
  return fromZonedTime(`${calendar}T${pad(h)}:${pad(m)}:00`, tz).getTime()
}

/** Lights-out deadline for a game day (default "00:00" = midnight at the end of that day). */
export function deadlineTs(key: string, lightsOut: string, tz: string = TZ): number {
  return clockTs(key, lightsOut, tz)
}

export function isOnTime(ts: number, key: string, lightsOut: string, tz: string = TZ): boolean {
  return ts <= deadlineTs(key, lightsOut, tz)
}

export function isWeekend(key: string): boolean {
  const w = weekday(key)
  return w === 0 || w === 6
}

export function wakeTimeFor(key: string, weekdayWake: string, weekendWake: string): string {
  return isWeekend(key) ? weekendWake : weekdayWake
}

/** Minutes in bed between lights-out and wake (rail: never schedule under 7 h). */
export function sleepWindowMinutes(lightsOut: string, wake: string): number {
  const [lh, lm] = lightsOut.split(':').map(Number)
  const [wh, wm] = wake.split(':').map(Number)
  let diff = wh * 60 + wm - (lh * 60 + lm)
  if (diff <= 0) diff += 24 * 60
  return diff
}
