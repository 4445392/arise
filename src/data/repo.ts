import { addDays, dayKey as toDayKey, diffDays, isOnTime, minuteOfClock } from '../engine/day'
import { generateDailyQuest, scoreDay } from '../engine/dailyQuest'
import { modeForDay } from '../engine/mode'
import { nextObjective, streakFrom } from '../engine/next'
import {
  INITIAL_PENALTY_STATE,
  advancePenaltyState,
  isRecoveryDay,
} from '../engine/penalties'
import { addStats, dayStatXp, emptyStats, statLevel } from '../engine/stats'
import { nextScreenTarget, nextSteps, nextTrio, overScreenTarget, titleXpMult } from '../engine/forge'
import { computeInsights, decodedPct, type InsightInput } from '../engine/insights'
import { nextRampWeek, rampDecision, trustPct, type PromiseDay } from '../engine/trust'
import {
  fatigueStep,
  lowMoodLoadActive,
  needsDeload,
  needsRecovery,
  vitalsFrom,
  type CheckIn,
} from '../engine/vitals'
import { bossRaidXp, dayXp, isObjectiveDone, resolveLevel, type LevelState } from '../engine/xp'
import type { FearOutcome } from '../engine/fear'
import { STAT_KEYS, type Mode, type ObjectiveProgress, type ObjectiveSpec, type StatKey, type StatRecord } from '../engine/types'
import { AriseDB, SCHEMA_VERSION, TABLE_NAMES, type TableName } from './db'
import type {
  CheckInRec,
  DayFlags,
  DayLog,
  DeepWorkSession,
  Exam,
  FearEntry,
  JournalEntry,
  Player,
  PulseRec,
  Settings,
} from './models'

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  name: 'Sfundo',
  wakeWeekday: '08:00',
  wakeWeekend: '09:00',
  lightsOut: '00:00',
  gymDays: [1, 3, 4, 6],
  lastExamDay: '2026-11-30', // placeholder until Pre-Awakening sets the real date
  restartDay: '2027-02-01',
  studyTargetMin: 120,
  sound: true,
  voice: true,
  commitments: [],
  commitmentsBudgetMin: 600,
  mainQuestWindow: 'Peak focus 09:00–12:00',
  onboarded: false,
}

export interface Totals {
  xp: number
  level: LevelState
  statXp: StatRecord
  stats: Record<StatKey, number>
  trust7: number | null
  trust30: number | null
  streak: number
  promisesKept: number
  /** Last game day each stat was trained (for the visual RUST tag). */
  lastTrained: Record<StatKey, string | null>
}

export interface Snapshot {
  /** DECODED %: unlocked Mirror chapters / total. */
  decoded: number
  /** Pulse slots already logged today (1 = morning check-in). */
  pulseSlots: number[]
  settings: Settings
  player: Player
  today: string
  mode: Mode
  log: DayLog
  totals: Totals
  next: ObjectiveSpec | null
  exams: Exam[]
  /** Fears whose check-back date has arrived. */
  checkBacksDue: FearEntry[]
  minuteOfDay: number
}

export interface BackupFile {
  app: 'arise'
  schema: number
  exportedAt: string
  data: Partial<Record<TableName, unknown[]>>
}

export class Repo {
  constructor(
    public db: AriseDB,
    public now: () => number = () => Date.now(),
  ) {}

  today(): string {
    return toDayKey(this.now())
  }

  // ------------------------------------------------------------ bootstrap

  async init(): Promise<void> {
    await this.db.transaction('rw', this.db.settings, this.db.player, async () => {
      if (!(await this.db.settings.get(1))) await this.db.settings.put({ ...DEFAULT_SETTINGS })
      if (!(await this.db.player.get(1))) {
        await this.db.player.put({
          id: 1,
          installDay: this.today(),
          createdTs: this.now(),
          passedRanks: [],
          penalty: { ...INITIAL_PENALTY_STATE },
          fatigue: 0,
          rampWeek: 1,
          rampAnchor: null,
          weeklyFocusStat: null,
          lastModeSeen: null,
          lastClosedDay: null,
        })
      }
    })
  }

  async getSettings(): Promise<Settings> {
    return (await this.db.settings.get(1)) ?? { ...DEFAULT_SETTINGS }
  }

  async saveSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
    const next = { ...(await this.getSettings()), ...patch, id: 1 as const }
    await this.db.settings.put(next)
    return next
  }

  async getPlayer(): Promise<Player> {
    const p = await this.db.player.get(1)
    if (!p) throw new Error('Player not initialised — call init() first')
    return p
  }

  async savePlayer(patch: Partial<Omit<Player, 'id'>>): Promise<Player> {
    const next = { ...(await this.getPlayer()), ...patch, id: 1 as const }
    await this.db.player.put(next)
    return next
  }

  async completeOnboarding(input: {
    name: string
    wakeWeekday: string
    wakeWeekend: string
    lightsOut: string
    gymDays: number[]
    exams: { subject: string; dateKey: string }[]
    lastExamDay: string
    studyTargetMin?: number
  }): Promise<void> {
    const { exams, ...rest } = input
    await this.saveSettings({ ...rest, onboarded: true })
    await this.db.exams.clear()
    for (const e of exams) if (e.subject.trim() && e.dateKey) await this.db.exams.add({ subject: e.subject.trim(), dateKey: e.dateKey })
    // today's quest was built from defaults: rebuild it with the real settings
    await this.refreshQuest(this.today())
  }

  // ------------------------------------------------------------ exams / boss raids

  listExams(): Promise<Exam[]> {
    return this.db.exams.orderBy('dateKey').toArray()
  }

  async addExam(subject: string, dateKey: string): Promise<number> {
    return (await this.db.exams.add({ subject: subject.trim(), dateKey })) as number
  }

  async removeExam(id: number): Promise<void> {
    await this.db.exams.delete(id)
  }

  private async eventExists(source: string): Promise<boolean> {
    return (await this.db.events.where('source').equals(source).count()) > 0
  }

  /** Boss Raid: XP for showing up (once). */
  async confirmBossShowUp(examId: number): Promise<number> {
    const exam = await this.db.exams.get(examId)
    if (!exam) return 0
    const source = `boss-show:${examId}`
    if (await this.eventExists(source)) return 0
    const xp = bossRaidXp(true, false)
    await this.db.exams.update(examId, { showedUp: true })
    await this.db.events.add({ ts: this.now(), dayKey: this.today(), source, label: `Boss Raid: ${exam.subject}`, xp, statXp: { NRV: 8, WIL: 8 } })
    return xp
  }

  /** Boss Raid: bonus XP when the result is logged (once). */
  async logBossResult(examId: number, resultPct: number): Promise<number> {
    const exam = await this.db.exams.get(examId)
    if (!exam) return 0
    await this.db.exams.update(examId, { resultPct, resultLoggedTs: this.now() })
    const source = `boss-result:${examId}`
    if (await this.eventExists(source)) return 0
    const xp = bossRaidXp(true, true) - bossRaidXp(true, false)
    await this.db.events.add({ ts: this.now(), dayKey: this.today(), source, label: `Boss result: ${exam.subject}`, xp, statXp: { WIS: 6, INT: 6 } })
    return xp
  }

  // ------------------------------------------------------------ day lifecycle

  private async modeFor(day: string, s?: Settings): Promise<Mode> {
    const settings = s ?? (await this.getSettings())
    const ex = [...(settings.semesterExams ?? [])].sort()
    const examWindows = ex.length ? [{ from: addDays(ex[0], -14), to: ex[ex.length - 1] }] : undefined
    return modeForDay(day, { lastExamDay: settings.lastExamDay, restartDay: settings.restartDay, examWindows })
  }

  private async recentMoods() {
    const logs = await this.db.dayLogs.toArray()
    return logs.filter((l) => l.checkIn).map((l) => ({ dayKey: l.dayKey, mood: l.checkIn!.mood }))
  }

  private async buildLog(day: string, flagsOverride?: Partial<DayFlags>, keep?: DayLog): Promise<DayLog> {
    const [settings, player, exams] = await Promise.all([this.getSettings(), this.getPlayer(), this.listExams()])
    const mode = await this.modeFor(day, settings)
    const recovery = keep?.flags.recovery ?? isRecoveryDay(player.penalty)
    const deload = keep?.flags.deload ?? needsDeload(player.fatigue)
    const lowMood = lowMoodLoadActive(await this.recentMoods(), day)
    const hpRecovery = keep?.checkIn ? needsRecovery(keep.checkIn.hp) : false
    const flags: DayFlags = { recovery, deload, lowMood, hpRecovery, ...flagsOverride }
    const penaltyIssued = keep ? !!keep.quest.penalty : player.penalty.penaltyPending && !recovery
    const quest = generateDailyQuest({
      mode,
      dayKey: day,
      gymDays: settings.gymDays,
      rampWeek: player.rampWeek,
      recovery: flags.recovery,
      deload: flags.deload,
      lowMood: flags.lowMood,
      hpRecovery: flags.hpRecovery,
      painSwap: !!player.painSwap?.until && player.painSwap.until >= day,
      penalty: penaltyIssued ? { hpLow: flags.hpRecovery || (keep?.checkIn ? needsRecovery(keep.checkIn.hp) : false) } : null,
      exams: exams.map((e) => ({ id: String(e.id), subject: e.subject, dateKey: e.dateKey })),
      studyTargetMin: settings.studyTargetMin,
      mainQuestWindow: settings.mainQuestWindow,
      trio: player.trio,
    })
    const base: DayLog = {
      dayKey: day,
      mode,
      quest,
      progress: keep?.progress ?? {},
      flags,
      checkIn: keep?.checkIn,
      screenMin: keep?.screenMin,
      kept: 0,
      total: 0,
      pct: 0,
      outcome: null,
      xp: 0,
      statXp: emptyStats(),
      lateKeys: keep?.lateKeys ?? [],
      closed: keep?.closed ?? false,
    }
    return this.recompute(base)
  }

  /** Recompute all derived fields (kept %, outcome, XP, stat-XP) from progress. Pure of side effects. */
  private async recompute(log: DayLog): Promise<DayLog> {
    const player = await this.getPlayer()
    const score = scoreDay(log.quest, log.progress)
    const allDone = score.kept === score.total && score.penaltyCleared !== false
    const onTime = log.lateKeys.length === 0
    // the +25 % completion bonus needs an on-time finish; late logging still counts as kept
    const bonusOutcome = score.outcome === 'COMPLETE' && !onTime ? 'PARTIAL' : score.outcome
    const ctx = { mode: log.mode, weeklyFocusStat: player.weeklyFocusStat, titleMult: titleXpMult(player.equippedTitle) }
    const scrollDebuff = player.screenTargetMin != null && log.screenMin != null && overScreenTarget(log.screenMin, player.screenTargetMin)
    const xp = dayXp(log.quest.objectives, log.progress, bonusOutcome, ctx)
    return {
      ...log,
      kept: score.kept,
      total: score.total,
      pct: Math.round(score.pct),
      outcome: log.closed ? score.outcome : allDone ? 'COMPLETE' : null,
      xp: xp.total,
      statXp: dayStatXp(log.quest.objectives, log.progress, { ...ctx, scrollDebuff }),
    }
  }

  async ensureDay(day: string): Promise<DayLog> {
    const existing = await this.db.dayLogs.get(day)
    if (existing) return existing
    const log = await this.buildLog(day)
    await this.db.dayLogs.put(log)
    return log
  }

  /** Rebuild the quest spec (e.g. after settings or HP changed), keeping all progress. */
  async refreshQuest(day: string): Promise<DayLog> {
    const existing = await this.db.dayLogs.get(day)
    if (!existing) return this.ensureDay(day)
    if (existing.closed) return existing
    const log = await this.buildLog(day, undefined, existing)
    await this.db.dayLogs.put(log)
    return log
  }

  /** Close every finished day up to yesterday: score it, apply penalty / fatigue / ramp rules. */
  async rollover(): Promise<DayLog[]> {
    const player0 = await this.getPlayer()
    const today = this.today()
    const closed: DayLog[] = []
    let d = player0.lastClosedDay ? addDays(player0.lastClosedDay, 1) : player0.installDay
    while (d < today) {
      closed.push(await this.closeDay(d))
      d = addDays(d, 1)
    }
    return closed
  }

  private async closeDay(day: string): Promise<DayLog> {
    let log = await this.ensureDay(day)
    log = await this.recompute({ ...log, closed: true })
    await this.db.dayLogs.put(log)
    const p = await this.getPlayer()
    const penalty = advancePenaltyState(p.penalty, log.outcome ?? 'FAILED', log.flags.recovery)
    const hp = log.checkIn?.hp ?? 70
    const fullLoad = !log.flags.recovery && !log.flags.deload && !log.quest.isSunday
    let fatigue = log.flags.deload ? 0 : fatigueStep(p.fatigue, hp, fullLoad)
    if (fatigue < 0) fatigue = 0
    let { rampWeek, rampAnchor } = p
    let weekly: 'advance' | 'hold' | 'step_back' | null = null
    if (log.mode === 'BREAK') {
      if (!rampAnchor) rampAnchor = day
      if (diffDays(rampAnchor, day) % 7 === 6) {
        const logs = await this.db.dayLogs.toArray()
        const decision = rampDecision(trustPct(toPromises(logs), day, 7))
        rampWeek = nextRampWeek(rampWeek, decision)
        weekly = decision
      }
    }
    const patch: Partial<Player> = { penalty, fatigue, rampWeek, rampAnchor, lastClosedDay: day }
    if (weekly && p.trio && !(p.painSwap?.until && p.painSwap.until >= day)) {
      patch.trio = { push: nextTrio(p.trio.push, weekly), squat: nextTrio(p.trio.squat, weekly), sit: nextTrio(p.trio.sit, weekly), steps: nextSteps(p.trio.steps, weekly) }
    } else if (weekly && p.trio) {
      patch.trio = { ...p.trio, steps: nextSteps(p.trio.steps, weekly) }
    }
    if (weekly && p.screenTargetMin != null && p.screenBaselineMin != null) patch.screenTargetMin = nextScreenTarget(p.screenTargetMin, p.screenBaselineMin, weekly)
    await this.savePlayer(patch)
    return log
  }

  // ------------------------------------------------------------ progress

  /** Apply a change to one objective's progress and persist the recomputed day. */
  async updateProgress(day: string, key: string, fn: (prev: ObjectiveProgress) => ObjectiveProgress): Promise<DayLog> {
    const log = await this.ensureDay(day)
    const spec = [...log.quest.objectives, ...(log.quest.penalty ? [log.quest.penalty] : [])].find((o) => o.key === key)
    if (!spec) throw new Error(`Unknown objective ${key}`)
    const before = log.progress[key] ?? { items: [], value: 0 }
    const after = { ...fn({ ...before, items: [...before.items] }), firstTs: before.firstTs ?? this.now() }
    const wasDone = isObjectiveDone(spec, before)
    const nowDone = isObjectiveDone(spec, after)
    const settings = await this.getSettings()
    let lateKeys = log.lateKeys
    if (!wasDone && nowDone && !isOnTime(this.now(), day, settings.lightsOut)) lateKeys = [...lateKeys, key]
    if (wasDone && !nowDone) lateKeys = lateKeys.filter((k) => k !== key)
    const next = await this.recompute({ ...log, progress: { ...log.progress, [key]: after }, lateKeys })
    await this.db.dayLogs.put(next)
    return next
  }

  toggleItem(day: string, key: string, itemId: string): Promise<DayLog> {
    return this.updateProgress(day, key, (p) => ({
      ...p,
      items: p.items.includes(itemId) ? p.items.filter((i) => i !== itemId) : [...p.items, itemId],
    }))
  }

  setItem(day: string, key: string, itemId: string, on: boolean): Promise<DayLog> {
    return this.updateProgress(day, key, (p) => ({
      ...p,
      items: on ? (p.items.includes(itemId) ? p.items : [...p.items, itemId]) : p.items.filter((i) => i !== itemId),
    }))
  }

  async addValue(day: string, key: string, delta: number, awayDelta = 0): Promise<DayLog> {
    if (key === 'SKILL_GATE' && delta !== 0) await this.addSkillMinutes(delta)
    return this.updateProgress(day, key, (p) => ({
      ...p,
      value: Math.max(0, p.value + delta),
      awayMin: Math.max(0, (p.awayMin ?? 0) + awayDelta),
    }))
  }

  // ------------------------------------------------------------ check-in, pulses, journal

  /** Morning check-in (15 s): computes HP/MP, records Pulse #1, and may switch Body to Recovery Protocol. */
  async checkIn(c: CheckIn): Promise<{ hp: number; mp: number; recovery: boolean }> {
    const day = this.today()
    await this.ensureDay(day)
    const { hp, mp } = vitalsFrom(c)
    const rec: CheckInRec = { ...c, hp, mp, ts: this.now() }
    const log = await this.db.dayLogs.get(day)
    if (!log) throw new Error('missing day')
    await this.db.dayLogs.put({ ...log, checkIn: rec })
    await this.db.pulses.add({ ts: this.now(), dayKey: day, slot: 1, energy: c.energy, focus: null, mood: c.mood, activity: 'rest', urge: false })
    await this.refreshQuest(day)
    return { hp, mp, recovery: needsRecovery(hp) }
  }

  async addPulse(p: Omit<PulseRec, 'id' | 'ts' | 'dayKey'>): Promise<void> {
    const day = this.today()
    await this.db.pulses.add({ ...p, ts: this.now(), dayKey: day })
    const count = await this.db.pulses.where('dayKey').equals(day).count()
    if (count >= 3) await this.setItem(day, 'SHUTDOWN', 'pulses', true).catch(() => undefined)
  }

  pulsesFor(day: string): Promise<PulseRec[]> {
    return this.db.pulses.where('dayKey').equals(day).toArray()
  }

  async saveJournal(j: Omit<JournalEntry, 'id' | 'ts' | 'dayKey'>): Promise<void> {
    const day = this.today()
    const existing = await this.db.journal.where('dayKey').equals(day).first()
    if (existing?.id) await this.db.journal.update(existing.id, { ...j, ts: this.now() })
    else await this.db.journal.add({ ...j, ts: this.now(), dayKey: day })
    const ok = [j.kept, j.fear, j.lesson].every((l) => l.trim().length > 0)
    await this.setItem(day, 'SHUTDOWN', 'journal', ok)
    if (j.nextBlock !== undefined) await this.setItem(day, 'SHUTDOWN', 'next', j.nextBlock.trim().length > 0)
  }

  journalFor(day: string): Promise<JournalEntry | undefined> {
    return this.db.journal.where('dayKey').equals(day).first()
  }

  // ------------------------------------------------------------ dungeon sessions

  async logSession(s: Omit<DeepWorkSession, 'id' | 'ts' | 'dayKey'>): Promise<DayLog> {
    const day = this.today()
    await this.db.sessions.add({ ...s, ts: this.now(), dayKey: day })
    return this.addValue(day, s.objectiveKey, s.minutes, s.phoneAway ? s.minutes : 0)
  }

  /** Minutes practised on the current Skill Gate (cumulative per skill). */
  async addSkillMinutes(minutes: number): Promise<void> {
    const gates = await this.db.skillGates.toArray()
    const cur = gates.filter((g) => !g.clearedDay).at(-1)
    if (!cur) return
    const row = await this.db.skillLevels.where('skillId').equals(cur.skillId).first()
    if (row?.id) await this.db.skillLevels.update(row.id, { minutes: Math.max(0, row.minutes + minutes) })
    else await this.db.skillLevels.add({ skillId: cur.skillId, minutes })
  }

  // ------------------------------------------------------------ drift

  async addDrift(cause: string, note?: string): Promise<number> {
    return (await this.db.drifts.add({ ts: this.now(), dayKey: this.today(), cause, note })) as number
  }

  /** Re-entry: the ignition timer finished. Within 30 min of the drift = a small WIL bonus. */
  async completeReentry(driftId: number): Promise<{ minutes: number; bonus: boolean }> {
    const d = await this.db.drifts.get(driftId)
    if (!d) return { minutes: 0, bonus: false }
    const minutes = Math.max(0, Math.round((this.now() - d.ts) / 60_000))
    await this.db.drifts.update(driftId, { reentryTs: this.now(), reentryMin: minutes })
    const bonus = minutes <= 30
    if (bonus) {
      await this.db.events.add({ ts: this.now(), dayKey: this.today(), source: `reentry:${driftId}`, label: 'Re-entry within 30 min', xp: 5, statXp: { WIL: 4 } })
    }
    return { minutes, bonus }
  }

  /** "Urge resisted": +1 WIL (a small WIL stat-XP bump) and a timestamp for the Mirror. */
  async urgeResisted(): Promise<void> {
    await this.db.events.add({ ts: this.now(), dayKey: this.today(), source: `urge:${this.now()}`, label: 'Urge resisted', xp: 2, statXp: { WIL: 3, FOC: 2 } })
    await this.db.pulses.add({ ts: this.now(), dayKey: this.today(), slot: 2, energy: 3, focus: 3, mood: 3, activity: 'phone', urge: true }).catch(() => undefined)
  }

  // ------------------------------------------------------------ fears

  async addFear(f: Omit<FearEntry, 'id' | 'ts' | 'dayKey'>): Promise<number> {
    const day = this.today()
    const id = (await this.db.fears.add({ ...f, ts: this.now(), dayKey: day })) as number
    if (f.examId != null) {
      // writing a fear for an exam completes today's Pre-Boss Ritual for it
      const log = await this.db.dayLogs.get(day)
      const key = `RITUAL:${f.examId}`
      if (log?.quest.objectives.some((o) => o.key === key)) await this.setItem(day, key, 'fear', true)
    }
    return id
  }

  async resolveFear(id: number, outcome: FearOutcome, whatHappened: string): Promise<void> {
    await this.db.fears.update(id, { outcome, whatHappened, resolvedTs: this.now() })
  }

  listFears(): Promise<FearEntry[]> {
    return this.db.fears.orderBy('ts').reverse().toArray()
  }

  // ------------------------------------------------------------ totals & snapshot

  async totals(): Promise<Totals> {
    const [logs, events, player] = await Promise.all([this.db.dayLogs.toArray(), this.db.events.toArray(), this.getPlayer()])
    let xp = 0
    let statXp = emptyStats()
    for (const l of logs) {
      xp += l.xp
      statXp = addStats(statXp, l.statXp)
    }
    for (const e of events) {
      xp += e.xp
      if (e.statXp) statXp = addStats(statXp, e.statXp)
    }
    const today = this.today()
    const promises = toPromises(logs)
    const ordered = [...logs].sort((a, b) => a.dayKey.localeCompare(b.dayKey))
    const lastTrained = Object.fromEntries(STAT_KEYS.map((k) => [k, null])) as Record<StatKey, string | null>
    for (const l of ordered) for (const k of STAT_KEYS) if (l.statXp[k] > 0) lastTrained[k] = l.dayKey
    return {
      xp: Math.round(xp),
      level: resolveLevel(xp, player.passedRanks),
      statXp,
      stats: Object.fromEntries(STAT_KEYS.map((k) => [k, statLevel(statXp[k])])) as Record<StatKey, number>,
      trust7: trustPct(promises, today, 7),
      trust30: trustPct(promises, today, 30),
      streak: streakFrom(ordered.map((l) => l.outcome)),
      promisesKept: logs.reduce((s, l) => s + l.kept, 0),
      lastTrained,
    }
  }

  /** Map stored rows to the shapes the pure insights engine reads. */
  async insightInput(): Promise<InsightInput> {
    const [pulses, drifts, sessions, logs, fears, level, screen, feedback, motives, audits, assess] = await Promise.all([
      this.db.pulses.toArray(),
      this.db.drifts.toArray(),
      this.db.sessions.toArray(),
      this.db.dayLogs.toArray(),
      this.db.fears.toArray(),
      this.totals().then((t) => t.level.level),
      this.db.screenTime.toArray(),
      this.db.feedback.toArray(),
      this.db.motiveTags.toArray(),
      this.db.thoughtAudits.toArray(),
      this.db.assessments.orderBy('ts').toArray(),
    ])
    const deep = new Map<string, number>()
    for (const s of sessions) deep.set(s.dayKey, (deep.get(s.dayKey) ?? 0) + s.minutes)
    const screenBy = new Map(screen.map((s) => [s.dayKey, s.minutes]))
    return {
      pulses: pulses.map((p) => ({ ts: p.ts, dayKey: p.dayKey, energy: p.energy, focus: p.focus ?? 0, mood: p.mood, activity: p.activity, urge: p.urge })),
      ratings: feedback.map((f) => ({ objective: f.objectiveKey.split(':')[0], difficulty: f.difficulty, enjoyment: f.enjoyment, startDelayMin: f.startDelayMin ?? null })),
      drifts: drifts.map((d) => ({ ts: d.ts, cause: d.cause })),
      motives: motives.map((m) => ({ motive: m.motive })),
      sessions: sessions.map((s) => ({ startTs: s.ts - s.minutes * 60_000, minutes: s.minutes, quality: s.quality })),
      days: logs.map((l) => ({
        dayKey: l.dayKey,
        sleepHours: l.checkIn?.sleepHours ?? null,
        completionPct: l.pct,
        deepWorkMin: deep.get(l.dayKey) ?? 0,
        screenMin: screenBy.get(l.dayKey) ?? l.screenMin ?? null,
      })),
      fears: fears.map((f) => ({ id: f.id ?? 0, predicted: f.predicted, severity: f.severity, outcome: f.outcome })),
      audits: audits.map((a) => ({ traps: a.traps })),
      ipip: (assess.filter((a) => a.kind === 'ipip').at(-1)?.result as InsightInput['ipip']) ?? null,
      values: (assess.filter((a) => a.kind === 'values').at(-1)?.result as string[] | undefined) ?? null,
      skills: await this.skillRecs(feedback),
      level,
    }
  }

  private async skillRecs(feedback: { objectiveKey: string; enjoyment: number }[]): Promise<InsightInput['skills']> {
    const [gates, levels] = await Promise.all([this.db.skillGates.toArray(), this.db.skillLevels.toArray()])
    const enj = feedback.filter((f) => f.objectiveKey === 'SKILL_GATE').map((f) => f.enjoyment)
    const avg = enj.length ? enj.reduce((a, b) => a + b, 0) / enj.length : 3
    return gates.filter((g) => g.clearedDay).map((g) => ({ name: g.skillId, hours: (levels.find((l) => l.skillId === g.skillId)?.minutes ?? 0) / 60, daysActive: diffDays(g.startDay, g.clearedDay!) + 1, avgEnjoyment: avg }))
  }

  async decoded(): Promise<number> {
    return decodedPct(computeInsights(await this.insightInput()))
  }

  async snapshot(): Promise<Snapshot> {
    await this.init()
    await this.rollover()
    const cutoff = this.now() - 30 * 86_400_000
    await this.db.recordings.where('ts').below(cutoff).delete() // teach-back audio is auto-deleted after 30 days
    const today = this.today()
    const log = await this.ensureDay(today)
    const [settings, player, totals, exams, fears, decoded] = await Promise.all([
      this.getSettings(),
      this.getPlayer(),
      this.totals(),
      this.listExams(),
      this.db.fears.toArray(),
      this.decoded(),
    ])
    const minuteOfDay = minuteOfClock(this.now())
    const pulseSlots = (await this.pulsesFor(today)).map((p) => p.slot)
    return {
      decoded,
      pulseSlots,
      settings,
      player,
      today,
      mode: log.mode,
      log,
      totals,
      next: nextObjective(log.quest, log.progress, minuteOfDay),
      exams,
      checkBacksDue: fears.filter((f) => !f.outcome && f.checkBack <= today),
      minuteOfDay,
    }
  }

  // ------------------------------------------------------------ export / import

  async exportAll(): Promise<BackupFile> {
    const data: BackupFile['data'] = {}
    for (const t of TABLE_NAMES) data[t] = await this.db.table(t).toArray()
    return { app: 'arise', schema: SCHEMA_VERSION, exportedAt: new Date(this.now()).toISOString(), data }
  }

  /** Replace all data with a backup. Validates first; nothing is touched if the file is not a valid ARISE backup. */
  async importAll(file: unknown): Promise<{ tables: number; rows: number }> {
    if (!file || typeof file !== 'object') throw new Error('Not an ARISE backup file.')
    const f = file as Partial<BackupFile>
    if (f.app !== 'arise') throw new Error('Not an ARISE backup file.')
    if (typeof f.schema !== 'number' || f.schema > SCHEMA_VERSION) throw new Error('This backup is from a newer version of ARISE.')
    if (!f.data || typeof f.data !== 'object') throw new Error('Backup has no data.')
    const data = f.data as Record<string, unknown>
    for (const t of TABLE_NAMES) if (data[t] !== undefined && !Array.isArray(data[t])) throw new Error(`Backup table "${t}" is malformed.`)
    if (!Array.isArray(data.settings) || !data.settings.length) throw new Error('Backup is missing settings.')
    let rows = 0
    await this.db.transaction('rw', TABLE_NAMES.map((t) => this.db.table(t)), async () => {
      for (const t of TABLE_NAMES) {
        const table = this.db.table(t)
        await table.clear()
        const items = (data[t] as unknown[] | undefined) ?? []
        if (items.length) await table.bulkPut(items)
        rows += items.length
      }
    })
    return { tables: TABLE_NAMES.length, rows }
  }

  async resetAll(): Promise<void> {
    await this.db.transaction('rw', [...TABLE_NAMES.map((t) => this.db.table(t)), this.db.recordings], async () => {
      for (const t of TABLE_NAMES) await this.db.table(t).clear()
      await this.db.recordings.clear()
    })
  }
}

function toPromises(logs: readonly DayLog[]): PromiseDay[] {
  return logs.map((l) => ({ dayKey: l.dayKey, kept: l.kept, total: l.total }))
}
