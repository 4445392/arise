import { addDays, diffDays, weekday } from '../engine/day'
import { disasterLine } from '../engine/fear'
import { hiddenForDay, weekKey } from '../engine/hidden'
import { buildIcs } from '../engine/ics'
import { computeInsights } from '../engine/insights'
import { buildReport, weeklyFocusStat } from '../engine/report'
import { EXTRACTION_XP, shadowName, shadowRank } from '../engine/shadows'
import { addStats, emptyStats, statLevel } from '../engine/stats'
import { STAT_KEYS, type StatKey, type StatRecord } from '../engine/types'
import { isObjectiveDone } from '../engine/xp'
import { HIDDEN_QUESTS, type HiddenQuest } from '../content/hiddenQuests'
import type { Repo } from './repo'
import type { Shadow } from './models'

// ================================================================ Shadow Army
/** ARISE: a resolved fear becomes a Shadow. Idempotent per fear. */
export async function arise(repo: Repo, fearId: number): Promise<Shadow | null> {
  const fear = await repo.db.fears.get(fearId)
  if (!fear || !fear.outcome) return null
  const existing = await repo.db.shadows.where('ts').above(0).filter((s) => s.fearId === fearId).first()
  if (existing) return existing
  const shadow: Shadow = { ts: repo.now(), name: shadowName(fear.afraid), severity: fear.severity, fearId }
  shadow.id = (await repo.db.shadows.add(shadow)) as number
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `shadow:${fearId}`, label: shadow.name, xp: EXTRACTION_XP + fear.severity * 4, statXp: { NRV: 6 + fear.severity } })
  return shadow
}

export const listShadows = (repo: Repo) => repo.db.shadows.orderBy('ts').reverse().toArray()
export { shadowRank }

// ================================================================ Hidden quests
export interface HiddenState extends HiddenQuest {
  done: boolean
}

export async function hiddenToday(repo: Repo, level: number): Promise<HiddenState[]> {
  const today = repo.today()
  const wk = weekKey(today)
  const list = hiddenForDay(today, level)
  const out: HiddenState[] = []
  for (const q of list) {
    const done = (await repo.db.events.where('source').equals(`hidden:${wk}:${q.id}`).count()) > 0
    out.push({ ...q, done })
  }
  return out
}

export async function completeHidden(repo: Repo, id: string): Promise<number> {
  const q = HIDDEN_QUESTS.find((h) => h.id === id)
  if (!q) return 0
  const source = `hidden:${weekKey(repo.today())}:${id}`
  if ((await repo.db.events.where('source').equals(source).count()) > 0) return 0
  const statXp: Partial<StatRecord> = {}
  for (const s of q.stats) statXp[s] = 10 / q.stats.length + 4
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source, label: `Hidden Quest: ${q.title}`, xp: q.xp, statXp })
  return q.xp
}

// ================================================================ Guild Report
async function statLevelsAsOf(repo: Repo, beforeDay: string): Promise<Record<StatKey, number>> {
  let sx = emptyStats()
  for (const l of await repo.db.dayLogs.toArray()) if (l.dayKey < beforeDay) sx = addStats(sx, l.statXp)
  for (const e of await repo.db.events.toArray()) if (e.dayKey < beforeDay && e.statXp) sx = addStats(sx, e.statXp)
  return Object.fromEntries(STAT_KEYS.map((k) => [k, statLevel(sx[k])])) as Record<StatKey, number>
}

/** Build the report for the week containing today and store it; also picks the next Weekly Focus Stat. */
export async function guildReport(repo: Repo): Promise<{ text: string; focusStat: StatKey; weekStart: string }> {
  const today = repo.today()
  const start = weekKey(today)
  const end = addDays(start, 6)
  const [logs, drifts, fears, totals, settings] = await Promise.all([repo.db.dayLogs.toArray(), repo.db.drifts.toArray(), repo.db.fears.toArray(), repo.totals(), repo.getSettings()])
  const week = logs.filter((l) => l.dayKey >= start && l.dayKey <= end)
  const events = (await repo.db.events.toArray()).filter((e) => e.dayKey >= start && e.dayKey <= end)
  const byObjective: Record<string, { kept: number; total: number }> = {}
  for (const l of week) for (const o of l.quest.objectives) {
    const b = (byObjective[o.id] ??= { kept: 0, total: 0 })
    b.total++
    if (isObjectiveDone(o, l.progress[o.key])) b.kept++
  }
  const outcomes = { complete: 0, partial: 0, failed: 0 }
  for (const l of week) {
    const o = l.outcome ?? (l.dayKey < today ? 'FAILED' : null)
    if (o === 'COMPLETE') outcomes.complete++
    else if (o === 'PARTIAL') outcomes.partial++
    else if (o === 'FAILED') outcomes.failed++
  }
  const sessions = (await repo.db.sessions.toArray()).filter((s) => s.dayKey >= start && s.dayKey <= end)
  const screen = (await repo.db.screenTime.toArray()).filter((s) => s.dayKey >= start && s.dayKey <= end)
  const driftCauses: Record<string, number> = {}
  for (const d of drifts.filter((x) => x.dayKey >= start && x.dayKey <= end)) driftCauses[d.cause] = (driftCauses[d.cause] ?? 0) + 1
  const insights = computeInsights(await repo.insightInput())
  const focusStat = weeklyFocusStat(totals.stats)
  const text = buildReport({
    name: settings.name,
    weekStart: start,
    weekEnd: end,
    level: totals.level.level,
    rank: totals.level.rank,
    xpWeek: week.reduce((s, l) => s + l.xp, 0) + events.reduce((s, e) => s + e.xp, 0),
    statsBefore: await statLevelsAsOf(repo, start),
    statsAfter: totals.stats,
    trust7: totals.trust7,
    trust30: totals.trust30,
    outcomes,
    byObjective,
    deepWorkMin: sessions.reduce((s, x) => s + x.minutes, 0),
    screenAvgMin: screen.length ? screen.reduce((s, x) => s + x.minutes, 0) / screen.length : null,
    drifts: driftCauses,
    fearLine: disasterLine(fears.map((f) => ({ id: f.id ?? 0, predicted: f.predicted, severity: f.severity, outcome: f.outcome }))),
    focusStat,
    newInsights: insights.filter((i) => i.unlocked).slice(0, 3).map((i) => i.headline),
  })
  const existing = await repo.db.weeklyReports.where('weekKey').equals(start).first()
  if (existing?.id) await repo.db.weeklyReports.update(existing.id, { text, ts: repo.now(), focusStat })
  else await repo.db.weeklyReports.add({ weekKey: start, ts: repo.now(), text, focusStat })
  // Focus Stat applies from Monday: only change it for the coming week once the report is built on/after Sunday
  if (weekday(today) === 0) await repo.savePlayer({ weeklyFocusStat: focusStat })
  return { text, focusStat, weekStart: start }
}

// ================================================================ backup + calendar
export async function markBackup(repo: Repo): Promise<void> {
  await repo.saveSettings({ lastBackupDay: repo.today() })
}

export async function icsText(repo: Repo): Promise<string> {
  const s = await repo.getSettings()
  const times = s.mainQuestWindow.match(/\d{2}:\d{2}/g)
  return buildIcs({
    startDay: repo.today(),
    wakeWeekday: s.wakeWeekday,
    wakeWeekend: s.wakeWeekend,
    lightsOut: s.lightsOut,
    focusStart: times?.[0] ?? '09:00',
    focusEnd: times?.[1] ?? '12:00',
  })
}

export { diffDays }
