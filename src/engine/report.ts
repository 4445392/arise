import { STAT_KEYS, type StatKey } from './types'

/** The weakest stat (lowest level) becomes next week's Focus Stat (x1.5 XP on its objectives). Ties: first in STAT_KEYS order. */
export function weeklyFocusStat(stats: Record<StatKey, number>): StatKey {
  let best: StatKey = STAT_KEYS[0]
  for (const k of STAT_KEYS) if (stats[k] < stats[best]) best = k
  return best
}

export interface ReportInput {
  name: string
  weekStart: string
  weekEnd: string
  level: number
  rank: string
  xpWeek: number
  statsBefore: Record<StatKey, number>
  statsAfter: Record<StatKey, number>
  trust7: number | null
  trust30: number | null
  outcomes: { complete: number; partial: number; failed: number }
  byObjective: Record<string, { kept: number; total: number }>
  deepWorkMin: number
  screenAvgMin: number | null
  drifts: Record<string, number>
  fearLine: string
  focusStat: StatKey
  newInsights: string[]
}

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n)}%`)

/** Compact plain-text report (<= 400 words) built to paste into a Claude chat for coaching. */
export function buildReport(r: ReportInput): string {
  const lines: string[] = []
  lines.push(`ARISE weekly report — ${r.name}, ${r.weekStart} to ${r.weekEnd}`)
  lines.push(`Level ${r.level} (rank ${r.rank}). XP this week: ${Math.round(r.xpWeek)}.`)
  lines.push(`TRUST: 7-day ${pct(r.trust7)}, 30-day ${pct(r.trust30)}. Days: ${r.outcomes.complete} complete, ${r.outcomes.partial} partial, ${r.outcomes.failed} failed.`)
  const ups = STAT_KEYS.filter((k) => r.statsAfter[k] > r.statsBefore[k]).map((k) => `${k} ${r.statsBefore[k]}→${r.statsAfter[k]}`)
  lines.push(`Stat changes: ${ups.length ? ups.join(', ') : 'none'}.`)
  const obj = Object.entries(r.byObjective)
    .filter(([, v]) => v.total > 0)
    .map(([k, v]) => `${k} ${v.kept}/${v.total}`)
  lines.push(`Completion by objective: ${obj.join(', ') || 'no data'}.`)
  lines.push(`Deep work: ${(r.deepWorkMin / 60).toFixed(1)} h. Screen time avg: ${r.screenAvgMin === null ? 'not logged' : `${(r.screenAvgMin / 60).toFixed(1)} h/day`}.`)
  const dr = Object.entries(r.drifts).sort((a, b) => b[1] - a[1])
  lines.push(`Drifts: ${dr.length ? dr.map(([c, n]) => `${c} ×${n}`).join(', ') : 'none logged'}.`)
  lines.push(`Fear calibration: ${r.fearLine}`)
  if (r.newInsights.length) lines.push(`New insights: ${r.newInsights.join(' ')}`)
  lines.push(`Next week's Focus Stat: ${r.focusStat} (x1.5 XP).`)
  lines.push('Please coach me: what is the one pattern to fix, one thing to keep, and one small experiment for next week? Be kind and concrete.')
  const words = lines.join('\n').split(/\s+/)
  return words.length <= 400 ? lines.join('\n') : words.slice(0, 400).join(' ')
}

/** Backup nudge: Sundays (or any day 7+ days since the last export). */
export function backupDue(lastBackupDay: string | null | undefined, today: string, isSunday: boolean, diff: (a: string, b: string) => number): boolean {
  if (!lastBackupDay) return isSunday
  const gap = diff(lastBackupDay, today)
  return gap >= 7 || (isSunday && gap >= 1)
}
