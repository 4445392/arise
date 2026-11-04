import { DEFAULT_RUNGS, EMERGENCY, GATES, LIBRARY, MAIN_QUEST_I, type Timeboxed } from '../content/forge'
import { SKILLS, type SkillDef } from '../content/skills'
import { addDays, diffDays, weekday } from '../engine/day'
import {
  TITLES, assignJob, buildLadder, courageLevel, earnedTitles, essenceOf, canBuy, SHOP, examPassed, initialScreenTarget, initialSteps, initialTrio,
  pickNextSkill, rankExam, skillRank, type ExamCtx, type TitleCtx, type Criterion,
} from '../engine/forge'
import { hashSeed } from '../engine/rng'
import { nextRankToEarn, rankForLevel, type Rank } from '../engine/ranks'
import { STAT_KEYS } from '../engine/types'
import { isObjectiveDone } from '../engine/xp'
import type { Repo } from './repo'
import type { CourageRung, GoldEntry, ReadingLog, SkillGate } from './models'

// ================================================================ Full Awakening (Day 0 of BREAK)
export interface AwakeningInput {
  maxPush: number
  maxSquat: number
  maxSit: number
  plankSec: number
  steps: number
  screenMin: number
  lichess: number
  fears: { label: string; rating: number }[]
}

export async function saveAwakening(repo: Repo, a: AwakeningInput): Promise<void> {
  const ladder = buildLadder(DEFAULT_RUNGS, a.fears)
  await repo.savePlayer({
    awakened: true,
    trioMax: { push: a.maxPush, squat: a.maxSquat, sit: a.maxSit, plankSec: a.plankSec },
    trio: { push: initialTrio(a.maxPush), squat: initialTrio(a.maxSquat), sit: initialTrio(a.maxSit), steps: initialSteps(a.steps) },
    screenBaselineMin: a.screenMin,
    screenTargetMin: initialScreenTarget(a.screenMin),
    lichessStart: a.lichess,
    lichessNow: a.lichess,
    courageRungs: ladder,
  })
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: 'awakening', label: 'Full Awakening', xp: 200, statXp: { WIS: 10, NRV: 8, STR: 6 } })
  await repo.refreshQuest(repo.today())
}

// ================================================================ Skill Gates
export interface GateState {
  current: (SkillGate & { def: SkillDef; minutes: number }) | null
  cleared: { skillId: string; def: SkillDef; minutes: number }[]
  next: SkillDef | null
}

export async function gateState(repo: Repo): Promise<GateState> {
  const [gates, levels, totals] = await Promise.all([repo.db.skillGates.toArray(), repo.db.skillLevels.toArray(), repo.totals()])
  const mins = (id: string) => levels.find((l) => l.skillId === id)?.minutes ?? 0
  const cur = gates.filter((g) => !g.clearedDay).at(-1)
  const defOf = (id: string) => SKILLS.find((s) => s.id === id)!
  const doneIds = gates.filter((g) => g.clearedDay).map((g) => g.skillId)
  return {
    current: cur ? { ...cur, def: defOf(cur.skillId), minutes: mins(cur.skillId) } : null,
    cleared: gates.filter((g) => g.clearedDay).map((g) => ({ skillId: g.skillId, def: defOf(g.skillId), minutes: mins(g.skillId) })),
    next: pickNextSkill([...doneIds, ...(cur ? [cur.skillId] : [])], totals.stats),
  }
}

export async function startGate(repo: Repo): Promise<SkillDef | null> {
  const s = await gateState(repo)
  if (s.current || !s.next) return null
  await repo.db.skillGates.add({ skillId: s.next.id, startDay: repo.today(), checkpoints: {} })
  return s.next
}

export async function toggleCheckpoint(repo: Repo, gateId: number, idx: number): Promise<void> {
  const g = await repo.db.skillGates.get(gateId)
  if (!g) return
  await repo.db.skillGates.update(gateId, { checkpoints: { ...g.checkpoints, [idx]: !g.checkpoints[idx] } })
}

/** Boss Test cleared -> "NEW SKILL ACQUIRED: <name> Lv.1". */
export async function clearBoss(repo: Repo, gateId: number): Promise<SkillDef | null> {
  const g = await repo.db.skillGates.get(gateId)
  if (!g || g.clearedDay) return null
  const def = SKILLS.find((s) => s.id === g.skillId)!
  await repo.db.skillGates.update(gateId, { clearedDay: repo.today() })
  const stat = Object.fromEntries(def.stats.map((s) => [s, 25 / def.stats.length]))
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `skill:${g.skillId}`, label: `NEW SKILL ACQUIRED: ${def.name} Lv.1`, xp: 400, statXp: stat })
  return def
}

export const skillRankFor = (minutes: number) => skillRank(minutes / 60)

// ================================================================ Library
export async function logReading(repo: Repo, r: Omit<ReadingLog, 'id' | 'ts' | 'dayKey'>): Promise<void> {
  await repo.db.reading.add({ ...r, ts: repo.now(), dayKey: repo.today() })
  if (r.finished) await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `book:${r.book}`, label: `Finished: ${r.book}`, xp: 150, statXp: { WIS: 10, INT: 4 } })
}
export async function libraryState(repo: Repo) {
  const logs = await repo.db.reading.toArray()
  const finished = new Set(logs.filter((l) => l.finished).map((l) => l.book))
  const nextIdx = LIBRARY.findIndex((b) => !finished.has(b.title))
  return {
    books: LIBRARY.map((b) => ({ ...b, finished: finished.has(b.title), minutes: logs.filter((l) => l.book === b.title).reduce((s, l) => s + l.minutes, 0) })),
    next: nextIdx >= 0 ? LIBRARY[nextIdx] : null,
    finishedCount: finished.size,
    logs: logs.sort((a, b) => b.ts - a.ts).slice(0, 12),
  }
}

// ================================================================ Courage Ladder
export async function logCourage(repo: Repo, rung: number, label: string, fearBefore: number, fearAfter: number, rejected: boolean, note?: string): Promise<void> {
  await repo.db.courage.add({ ts: repo.now(), rung, label, fearBefore, fearAfter, rejected, note })
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `courage:${repo.now()}`, label: rejected ? 'Rejection collected' : 'Courage attempt', xp: 25 + (rejected ? 10 : 0), statXp: { NRV: 6, LCK: 4 } })
}
export async function courageState(repo: Repo) {
  const [attempts, p] = await Promise.all([repo.db.courage.orderBy('ts').toArray(), repo.getPlayer()])
  const rungs = p.courageRungs ?? DEFAULT_RUNGS
  return { rungs, attempts: attempts as CourageRung[], level: courageLevel(attempts, rungs.length), rejections: attempts.filter((a) => a.rejected).length }
}

// ================================================================ GOLD ledger + Main Quest I
export async function addGold(repo: Repo, amountZar: number, source: string, mainQuest: boolean): Promise<void> {
  await repo.db.gold.add({ ts: repo.now(), dayKey: repo.today(), amountZar, source, mainQuest })
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `gold:${repo.now()}`, label: `GOLD +R${amountZar}`, xp: Math.min(500, Math.round(amountZar / 10)), statXp: { LCK: 5, SEN: 3 } })
}
export async function goldState(repo: Repo) {
  const rows: GoldEntry[] = await repo.db.gold.orderBy('dayKey').toArray()
  const total = rows.reduce((s, g) => s + g.amountZar, 0)
  const mq = rows.filter((g) => g.mainQuest).reduce((s, g) => s + g.amountZar, 0)
  const byMonth = new Map<string, number>()
  for (const g of rows) byMonth.set(g.dayKey.slice(0, 7), (byMonth.get(g.dayKey.slice(0, 7)) ?? 0) + g.amountZar)
  return { rows: rows.reverse(), total, mq, bestMonth: Math.max(0, ...byMonth.values()) }
}
export async function completeChapter(repo: Repo, id: string): Promise<void> {
  const p = await repo.getPlayer()
  const done = p.mqDone ?? []
  if (done.includes(id)) return
  await repo.savePlayer({ mqDone: [...done, id] })
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `mq:${id}`, label: `Main Quest: ${id}`, xp: 150, statXp: { SEN: 6, LCK: 6, FOC: 4 } })
}
export async function addOutreach(repo: Repo, n = 1): Promise<number> {
  const p = await repo.getPlayer()
  const c = Math.min(50, (p.mqOutreach ?? 0) + n)
  await repo.savePlayer({ mqOutreach: c })
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `outreach:${repo.now()}`, label: 'Outreach conversation', xp: 15 * n, statXp: { NRV: 3 * n, LCK: 3 * n } })
  if (c >= 50) await completeChapter(repo, 'hunt')
  return c
}
export const mainQuestChapters = () => MAIN_QUEST_I.chapters

// ================================================================ Rank Exams
export async function examContext(repo: Repo): Promise<ExamCtx> {
  const [logs, totals, shadows, gs, c, lib, gold, p, decoded] = await Promise.all([
    repo.db.dayLogs.toArray(), repo.totals(), repo.db.shadows.count(), gateState(repo), courageState(repo), libraryState(repo), goldState(repo), repo.getPlayer(), repo.decoded(),
  ])
  const today = repo.today()
  const from = addDays(today, -29)
  const done = p.mqDone ?? []
  return {
    completeDaysLast30: logs.filter((l) => l.dayKey >= from && l.dayKey <= today && l.outcome === 'COMPLETE').length,
    trust30: totals.trust30,
    decoded,
    shadows,
    skillGatesCleared: gs.cleared.length,
    firstBossCleared: gs.cleared.length >= 1,
    mainQuestChaptersCleared: done.length,
    mainQuestIComplete: MAIN_QUEST_I.chapters.every((ch) => done.includes(ch.id)) && gold.mq >= MAIN_QUEST_I.targetZar,
    courageLevel: c.level,
    libraryBooks: lib.finishedCount,
    goldBestMonth: gold.bestMonth,
  }
}
export async function rankExamState(repo: Repo): Promise<{ rank: Rank; criteria: Criterion[]; available: boolean } | null> {
  const [t, p] = await Promise.all([repo.totals(), repo.getPlayer()])
  const rank = nextRankToEarn(p.passedRanks)
  if (!rank) return null
  return { rank, criteria: rankExam(rank, await examContext(repo)), available: t.level.capped }
}
export async function attemptRankExam(repo: Repo): Promise<{ passed: boolean; rank: Rank | null }> {
  const st = await rankExamState(repo)
  if (!st || !st.available) return { passed: false, rank: st?.rank ?? null }
  if (!examPassed(st.rank, await examContext(repo))) return { passed: false, rank: st.rank }
  const p = await repo.getPlayer()
  await repo.savePlayer({ passedRanks: [...p.passedRanks, st.rank] })
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `rank:${st.rank}`, label: `RANK EXAM PASSED: ${st.rank}`, xp: 300, statXp: { WIL: 12, WIS: 8 } })
  return { passed: true, rank: st.rank }
}

// ================================================================ Titles, Job
export async function titleContext(repo: Repo): Promise<TitleCtx> {
  const [logs, totals, shadows, lib, gold, p, decoded, drifts] = await Promise.all([
    repo.db.dayLogs.orderBy('dayKey').toArray(), repo.totals(), repo.db.shadows.count(), libraryState(repo), goldState(repo), repo.getPlayer(), repo.decoded(), repo.db.drifts.toArray(),
  ])
  let streak = 0
  for (const l of [...logs].reverse()) {
    const awaken = l.quest.objectives.find((o) => o.id === 'AWAKEN')
    if (awaken && isObjectiveDone(awaken, l.progress[awaken.key]) && !l.lateKeys.includes(awaken.key)) streak++
    else if (l.closed) break
  }
  const max = p.trioMax
  return {
    onTimeAwakenStreak: streak,
    trust30: totals.trust30,
    shadows,
    trioAt100: !!p.trio && p.trio.push >= 100 && p.trio.squat >= 100 && p.trio.sit >= 100 && !!max,
    screenUnderDays: p.screenTargetMin == null ? 0 : logs.filter((l) => l.screenMin != null && l.screenMin <= p.screenTargetMin!).length,
    libraryBooks: lib.finishedCount,
    mainQuestGold: gold.mq,
    puzzleGain: (p.lichessNow ?? 0) - (p.lichessStart ?? 0),
    reentries30: drifts.filter((d) => d.reentryMin != null && d.reentryMin <= 30).length,
    decoded,
  }
}
/** Award newly-earned titles; returns the new ones. */
export async function syncTitles(repo: Repo): Promise<string[]> {
  const have = new Set((await repo.db.titles.toArray()).map((t) => t.titleId))
  const fresh = earnedTitles(await titleContext(repo)).filter((id) => !have.has(id))
  for (const id of fresh) await repo.db.titles.add({ titleId: id, earnedTs: repo.now(), equipped: false })
  return fresh
}
export async function equipTitle(repo: Repo, id: string | null): Promise<void> {
  for (const t of await repo.db.titles.toArray()) await repo.db.titles.update(t.id!, { equipped: t.titleId === id })
  await repo.savePlayer({ equippedTitle: id })
  await repo.refreshQuest(repo.today())
}
export const titleName = (id: string) => TITLES.find((t) => t.id === id)?.name ?? id

export async function jobFor(repo: Repo) {
  const t = await repo.totals()
  return t.level.level >= 25 ? assignJob(t.stats) : null
}
export const rankLabel = rankForLevel

// ================================================================ Shop
export async function shopState(repo: Repo) {
  const [t, buys] = await Promise.all([repo.totals(), repo.db.purchases.toArray()])
  const spent = buys.reduce((s, b) => s + b.essence, 0)
  return { essence: essenceOf(t.xp, spent), rank: t.level.rank, items: SHOP, history: buys.sort((a, b) => b.ts - a.ts).slice(0, 10) }
}
export async function buy(repo: Repo, itemId: string): Promise<boolean> {
  const s = await shopState(repo)
  const item = SHOP.find((i) => i.id === itemId)
  if (!item || !canBuy(item, s.essence, s.rank)) return false
  await repo.db.purchases.add({ ts: repo.now(), itemId, essence: item.price })
  return true
}

// ================================================================ Emergency quests (Lv8+) and Gates (D-Rank)
export interface TimedState extends Timeboxed { done: boolean }

/** About one Emergency Quest per fortnight; appears on one deterministic day of the fortnight, open until done that day. */
export async function emergencyToday(repo: Repo): Promise<TimedState | null> {
  const t = await repo.totals()
  const today = repo.today()
  if (t.level.level < 8) return null
  const log = await repo.db.dayLogs.get(today)
  if (!log || log.mode === 'EXAM') return null
  const fortnight = Math.floor(diffDays('2026-01-05', today) / 14)
  const offset = hashSeed(`emerg:${fortnight}`) % 12 // Mon-Sat style spread over 14 days, skipping some
  const day = addDays(addDays('2026-01-05', fortnight * 14), offset)
  if (day !== today || weekday(today) === 0) return null
  const q = EMERGENCY[hashSeed(`emq:${fortnight}`) % EMERGENCY.length]
  const done = (await repo.db.events.where('source').equals(`emergency:${fortnight}`).count()) > 0
  return { ...q, done }
}
export async function completeEmergency(repo: Repo): Promise<number> {
  const q = await emergencyToday(repo)
  if (!q || q.done) return 0
  const fortnight = Math.floor(diffDays('2026-01-05', repo.today()) / 14)
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `emergency:${fortnight}`, label: q.title, xp: q.xp, statXp: Object.fromEntries(q.stats.map((s) => [s, 8])) })
  return q.xp
}

/** Saturday Gate raid after D-Rank: 2-3 h time-boxed sprint, rank-matched. */
export async function gateToday(repo: Repo) {
  const t = await repo.totals()
  const today = repo.today()
  if (weekday(today) !== 6 || t.level.rank === 'E') return null
  const g = GATES.find((x) => x.rank === t.level.rank) ?? GATES[1]
  const done = (await repo.db.events.where('source').equals(`gate:${today}`).count()) > 0
  return { ...g, done }
}
export async function completeGate(repo: Repo): Promise<number> {
  const g = await gateToday(repo)
  if (!g || g.done) return 0
  await repo.db.events.add({ ts: repo.now(), dayKey: repo.today(), source: `gate:${repo.today()}`, label: g.title, xp: 250, statXp: { ORD: 8, WIL: 8, LCK: 6 } })
  return 250
}

// ================================================================ Screen time + puzzles
export async function logScreenTime(repo: Repo, minutes: number): Promise<void> {
  const day = repo.today()
  const ex = await repo.db.screenTime.where('dayKey').equals(day).first()
  if (ex?.id) await repo.db.screenTime.update(ex.id, { minutes })
  else await repo.db.screenTime.add({ dayKey: day, minutes })
  const log = await repo.db.dayLogs.get(day)
  if (log) await repo.db.dayLogs.put({ ...log, screenMin: minutes })
  await repo.refreshQuest(day)
}
export async function updatePuzzleRating(repo: Repo, rating: number): Promise<void> {
  await repo.savePlayer({ lichessNow: rating })
}

// ================================================================ Teach-back recordings (stored locally, deleted after 30 days)
export const RECORDING_TTL_DAYS = 30
export async function saveRecording(repo: Repo, blob: Blob, seconds: number): Promise<void> {
  await repo.db.recordings.add({ ts: repo.now(), dayKey: repo.today(), blob, seconds })
}
export async function purgeOldRecordings(repo: Repo): Promise<number> {
  const cutoff = repo.now() - RECORDING_TTL_DAYS * 86_400_000
  const old = await repo.db.recordings.where('ts').below(cutoff).primaryKeys()
  await repo.db.recordings.bulkDelete(old)
  return old.length
}

export { STAT_KEYS }
