import { addDays } from './day'

export interface IcsInput {
  startDay: string
  wakeWeekday: string
  wakeWeekend: string
  lightsOut: string
  /** e.g. "09:00" */
  focusStart: string
  focusEnd: string
  guildReportTime?: string
  /** For deterministic output in tests. */
  stamp?: string
}

const TZ = 'Africa/Johannesburg'

function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

function hm(t: string): [number, number] {
  const [h, m] = t.split(':').map(Number)
  return [h, m]
}

function addMinutes(t: string, mins: number): { time: string; dayShift: number } {
  const [h, m] = hm(t)
  let total = h * 60 + m + mins
  let shift = 0
  while (total < 0) {
    total += 1440
    shift--
  }
  while (total >= 1440) {
    total -= 1440
    shift++
  }
  return { time: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`, dayShift: shift }
}

function dt(day: string, time: string): string {
  const [h, m] = hm(time)
  return `${day.replace(/-/g, '')}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`
}

interface Ev {
  uid: string
  title: string
  desc: string
  start: string
  end: string
  day: string
  byday: string
  alarmMin: number
}

/** Calendar file with wake alarm, focus window, Shutdown and the Sunday Guild Report. Alarms via VALARM. */
export function buildIcs(i: IcsInput): string {
  const stamp = i.stamp ?? '20260101T000000Z'
  const shut = addMinutes(i.lightsOut, -30)
  const shutEnd = addMinutes(shut.time, 25)
  const guild = i.guildReportTime ?? '18:00'
  const wakeEndWk = addMinutes(i.wakeWeekday, 15).time
  const wakeEndWe = addMinutes(i.wakeWeekend, 15).time
  const events: Ev[] = [
    { uid: 'wake-wk', title: 'ARISE: Daily Quest arrives', desc: 'Up, bed made, water, no phone for 30 minutes.', start: i.wakeWeekday, end: wakeEndWk, day: i.startDay, byday: 'MO,TU,WE,TH,FR', alarmMin: 0 },
    { uid: 'wake-we', title: 'ARISE: Daily Quest arrives', desc: 'Up, bed made, water, no phone for 30 minutes.', start: i.wakeWeekend, end: wakeEndWe, day: i.startDay, byday: 'SA,SU', alarmMin: 0 },
    { uid: 'focus', title: 'ARISE: Peak focus window', desc: 'Phone in another room. Open it. Do one line.', start: i.focusStart, end: i.focusEnd, day: i.startDay, byday: 'MO,TU,WE,TH,FR,SA', alarmMin: 5 },
    { uid: 'shutdown', title: 'ARISE: Shutdown', desc: '3 Pulses, Night Journal, plan tomorrow, lights out.', start: shut.time, end: shutEnd.time, day: addDays(i.startDay, shut.dayShift), byday: 'MO,TU,WE,TH,FR,SA,SU', alarmMin: 0 },
    { uid: 'guild', title: 'ARISE: Weekly Guild Report', desc: 'Review the week, Thought Audit, download a backup.', start: guild, end: addMinutes(guild, 30).time, day: i.startDay, byday: 'SU', alarmMin: 10 },
  ]
  const L: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ARISE//Schedule//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:ARISE`, `X-WR-TIMEZONE:${TZ}`]
  L.push('BEGIN:VTIMEZONE', `TZID:${TZ}`, 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0200', 'TZNAME:SAST', 'END:STANDARD', 'END:VTIMEZONE')
  for (const e of events) {
    L.push('BEGIN:VEVENT', `UID:${e.uid}@arise.local`, `DTSTAMP:${stamp}`, `DTSTART;TZID=${TZ}:${dt(e.day, e.start)}`, `DTEND;TZID=${TZ}:${dt(e.day, e.end)}`)
    L.push(`RRULE:FREQ=WEEKLY;BYDAY=${e.byday}`, `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.desc)}`)
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:-PT${e.alarmMin}M`, 'END:VALARM', 'END:VEVENT')
  }
  L.push('END:VCALENDAR')
  return L.map(fold).join('\r\n') + '\r\n'
}
