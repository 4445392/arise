import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { AriseDB } from './db'
import { Repo } from './repo'

let n = 0
let clock = 0
const at = (iso: string) => new Date(iso).getTime()
let repo: Repo

beforeEach(async () => {
  clock = at('2026-11-04T10:00:00+02:00') // Wednesday, gym day
  repo = new Repo(new AriseDB(`test-${++n}`), () => clock)
  await repo.init()
})

async function finishEverything(day = repo.today()) {
  const log = await repo.ensureDay(day)
  for (const o of [...log.quest.objectives, ...(log.quest.penalty ? [log.quest.penalty] : [])]) {
    if (o.kind === 'checklist') for (const i of o.items!) await repo.setItem(day, o.key, i.id, true)
    else await repo.addValue(day, o.key, o.target!)
  }
  return repo.db.dayLogs.get(day)
}

describe('bootstrap', () => {
  it('creates settings and player', async () => {
    expect((await repo.getSettings()).name).toBe('Sfundo')
    const p = await repo.getPlayer()
    expect(p.installDay).toBe('2026-11-04')
    expect(p.penalty.penaltyPending).toBe(false)
  })
  it('init is idempotent', async () => {
    await repo.saveSettings({ name: 'X' })
    await repo.init()
    expect((await repo.getSettings()).name).toBe('X')
  })
  it('onboarding saves settings and exams and rebuilds today with them', async () => {
    await repo.completeOnboarding({
      name: 'Sfundo',
      wakeWeekday: '07:30',
      wakeWeekend: '09:00',
      lightsOut: '23:30',
      gymDays: [1, 3],
      exams: [{ subject: 'Statistics', dateKey: '2026-11-05' }],
      lastExamDay: '2026-11-20',
      studyTargetMin: 90,
    })
    const s = await repo.getSettings()
    expect(s.onboarded).toBe(true)
    expect(s.wakeWeekday).toBe('07:30')
    const log = await repo.ensureDay('2026-11-04')
    expect(log.quest.objectives.find((o) => o.id === 'DUNGEONS')!.target).toBe(90)
    expect(log.quest.objectives.map((o) => o.id)).toContain('RITUAL') // night before the exam
    expect(log.quest.objectives.find((o) => o.id === 'BODY')!.title).toMatch(/Gym/) // Wednesday in [1,3]
  })
})

describe('daily quest persistence and XP', () => {
  it('creates an EXAM-mode quest for today', async () => {
    const log = await repo.ensureDay(repo.today())
    expect(log.mode).toBe('EXAM')
    expect(log.quest.objectives.length).toBeGreaterThanOrEqual(6)
    expect(log.xp).toBe(0)
  })
  it('ticking items completes an objective and awards its minutes as XP', async () => {
    const day = repo.today()
    const log0 = await repo.ensureDay(day)
    const awaken = log0.quest.objectives.find((o) => o.id === 'AWAKEN')!
    for (const i of awaken.items!) await repo.setItem(day, 'AWAKEN', i.id, true)
    const log = (await repo.db.dayLogs.get(day))!
    expect(log.kept).toBe(1)
    expect(log.xp).toBe(awaken.minutes)
  })
  it('un-ticking removes the XP (derived, never double-awarded)', async () => {
    const day = repo.today()
    for (const i of ['up', 'bed', 'water', 'phone']) await repo.toggleItem(day, 'AWAKEN', i)
    expect((await repo.db.dayLogs.get(day))!.xp).toBe(5)
    await repo.toggleItem(day, 'AWAKEN', 'phone')
    expect((await repo.db.dayLogs.get(day))!.xp).toBe(0)
    await repo.toggleItem(day, 'AWAKEN', 'phone')
    expect((await repo.db.dayLogs.get(day))!.xp).toBe(5)
    await repo.setItem(day, 'AWAKEN', 'phone', true)
    expect((await repo.db.dayLogs.get(day))!.xp).toBe(5)
  })
  it('finishing everything on time = COMPLETE with the +25 % bonus', async () => {
    const done = (await finishEverything())!
    expect(done.outcome).toBe('COMPLETE')
    const base = done.quest.objectives.reduce((s, o) => s + o.minutes, 0)
    expect(done.xp).toBeCloseTo(base * 1.25, 0)
  })
  it('finishing after lights-out still counts but loses the bonus', async () => {
    clock = at('2026-11-05T00:30:00+02:00') // still game-day 11-04
    expect(repo.today()).toBe('2026-11-04')
    const done = (await finishEverything())!
    expect(done.outcome).toBe('COMPLETE')
    expect(done.lateKeys.length).toBeGreaterThan(0)
    const base = done.quest.objectives.reduce((s, o) => s + o.minutes, 0)
    expect(done.xp).toBeCloseTo(base, 0)
  })
  it('logging a dungeon session adds minutes and phone-away minutes (x1.25)', async () => {
    const day = repo.today()
    await repo.logSession({ objectiveKey: 'DUNGEONS', subject: 'Stats', plannedMin: 60, minutes: 40, phoneAway: true, interruptions: 0, quality: 4 })
    const log = (await repo.db.dayLogs.get(day))!
    expect(log.progress.DUNGEONS!.value).toBe(40)
    expect(log.progress.DUNGEONS!.awayMin).toBe(40)
    expect(log.xp).toBeCloseTo(50, 5)
    expect(await repo.db.sessions.count()).toBe(1)
  })
  it('totals sum day XP and events; level state follows', async () => {
    await finishEverything()
    await repo.db.events.add({ ts: clock, dayKey: repo.today(), source: 'x', label: 'x', xp: 100 })
    const t = await repo.totals()
    expect(t.xp).toBeGreaterThan(100)
    expect(t.level.level).toBeGreaterThanOrEqual(1)
    expect(t.streak).toBe(1)
    expect(t.stats.WIL).toBeGreaterThanOrEqual(10)
  })
})

describe('rollover: penalties, recovery, never-miss-twice', () => {
  it('a missed day closes as FAILED and issues a Penalty Quest the next day', async () => {
    clock = at('2026-11-05T10:00:00+02:00')
    await repo.snapshot()
    const closed = (await repo.db.dayLogs.get('2026-11-04'))!
    expect(closed.closed).toBe(true)
    expect(closed.outcome).toBe('FAILED')
    const today = (await repo.db.dayLogs.get('2026-11-05'))!
    expect(today.quest.penalty).not.toBeNull()
    expect((await repo.getPlayer()).lastClosedDay).toBe('2026-11-04')
  })
  it('two failed days in a row -> Recovery Mode: 50 % load, no penalty', async () => {
    clock = at('2026-11-06T10:00:00+02:00')
    await repo.snapshot()
    const p = await repo.getPlayer()
    expect(p.penalty.recoveryDaysLeft).toBe(3)
    const today = (await repo.db.dayLogs.get('2026-11-06'))!
    expect(today.flags.recovery).toBe(true)
    expect(today.quest.penalty).toBeNull()
    expect(today.quest.loadFactor).toBe(0.5)
  })
  it('a PARTIAL day clears the penalty chain', async () => {
    clock = at('2026-11-05T10:00:00+02:00')
    await repo.snapshot() // 11-04 failed -> penalty on 11-05
    const log = (await repo.db.dayLogs.get('2026-11-05'))!
    for (const o of log.quest.objectives.slice(0, 5)) {
      if (o.kind === 'checklist') for (const i of o.items!) await repo.setItem('2026-11-05', o.key, i.id, true)
      else await repo.addValue('2026-11-05', o.key, o.target!)
    }
    await repo.addValue('2026-11-05', 'PENALTY', 20)
    clock = at('2026-11-06T10:00:00+02:00')
    await repo.snapshot()
    expect((await repo.db.dayLogs.get('2026-11-05'))!.outcome).toBe('PARTIAL')
    const p = await repo.getPlayer()
    expect(p.penalty.penaltyPending).toBe(false)
    expect(p.penalty.recoveryDaysLeft).toBe(0)
  })
  it('rollover is idempotent', async () => {
    clock = at('2026-11-08T10:00:00+02:00')
    await repo.snapshot()
    const a = await repo.getPlayer()
    await repo.snapshot()
    expect(await repo.getPlayer()).toEqual(a)
  })
})

describe('check-in and vitals', () => {
  it('low HP converts Body to the Recovery Protocol and records Pulse #1', async () => {
    const r = await repo.checkIn({ sleepHours: 4, sleepQuality: 1, energy: 2, mood: 2, pain: false })
    expect(r.recovery).toBe(true)
    const log = (await repo.db.dayLogs.get(repo.today()))!
    expect(log.quest.objectives.find((o) => o.id === 'BODY')!.title).toMatch(/Recovery Protocol/)
    expect(log.checkIn!.hp).toBeLessThan(40)
    expect(await repo.db.pulses.count()).toBe(1)
  })
  it('good sleep leaves the quest alone', async () => {
    const r = await repo.checkIn({ sleepHours: 8, sleepQuality: 4, energy: 4, mood: 4, pain: false })
    expect(r.recovery).toBe(false)
    expect((await repo.db.dayLogs.get(repo.today()))!.quest.objectives.find((o) => o.id === 'BODY')!.title).toMatch(/Gym/)
  })
  it('progress survives a quest refresh', async () => {
    await repo.toggleItem(repo.today(), 'AWAKEN', 'up')
    await repo.checkIn({ sleepHours: 8, sleepQuality: 4, energy: 4, mood: 4, pain: false })
    expect((await repo.db.dayLogs.get(repo.today()))!.progress.AWAKEN!.items).toContain('up')
  })
  it('three pulses tick the Shutdown "3 Pulses" item', async () => {
    for (let i = 0; i < 3; i++) await repo.addPulse({ slot: (i + 1) as 1 | 2 | 3, energy: 3, focus: 3, mood: 3, activity: 'study', urge: false })
    expect((await repo.db.dayLogs.get(repo.today()))!.progress.SHUTDOWN!.items).toContain('pulses')
  })
  it('a complete 3-line journal ticks Shutdown "journal"', async () => {
    await repo.saveJournal({ kept: 'a', fear: 'b', lesson: 'c' })
    expect((await repo.db.dayLogs.get(repo.today()))!.progress.SHUTDOWN!.items).toContain('journal')
    await repo.saveJournal({ kept: 'a', fear: '', lesson: 'c' })
    expect((await repo.db.dayLogs.get(repo.today()))!.progress.SHUTDOWN!.items).not.toContain('journal')
  })
})

describe('fear log, boss raids, drift', () => {
  it('a fear tied to an exam completes the Pre-Boss Ritual', async () => {
    const id = await repo.addExam('Statistics', '2026-11-05')
    await repo.refreshQuest(repo.today())
    const before = (await repo.db.dayLogs.get(repo.today()))!
    expect(before.quest.objectives.some((o) => o.key === `RITUAL:${id}`)).toBe(true)
    await repo.addFear({ situation: 'Stats exam', afraid: "I'll blank", predicted: 60, severity: 7, ifThen: 'If I blank, I will breathe and skip', checkBack: '2026-11-07', examId: id })
    expect((await repo.db.dayLogs.get(repo.today()))!.progress[`RITUAL:${id}`]!.items).toContain('fear')
  })
  it('resolving a fear stores the outcome; check-backs show up when due', async () => {
    const id = await repo.addFear({ situation: 's', afraid: 'a', predicted: 50, severity: 5, ifThen: 'x', checkBack: '2026-11-06' })
    clock = at('2026-11-06T10:00:00+02:00')
    expect((await repo.snapshot()).checkBacksDue).toHaveLength(1)
    await repo.resolveFear(id, 'no', 'It was fine')
    expect((await repo.snapshot()).checkBacksDue).toHaveLength(0)
    expect((await repo.db.fears.get(id))!.outcome).toBe('no')
  })
  it('lists fears newest first (regression: needs a ts index)', async () => {
    const a = await repo.addFear({ situation: 'a', afraid: 'first', predicted: 10, severity: 1, ifThen: 'x', checkBack: '2026-11-06' })
    clock += 1000
    const b = await repo.addFear({ situation: 'b', afraid: 'second', predicted: 10, severity: 1, ifThen: 'x', checkBack: '2026-11-06' })
    expect((await repo.listFears()).map((f) => f.id)).toEqual([b, a])
  })
  it('boss raid XP is awarded once', async () => {
    const id = await repo.addExam('Maths', '2026-11-04')
    expect(await repo.confirmBossShowUp(id)).toBe(150)
    expect(await repo.confirmBossShowUp(id)).toBe(0)
    expect(await repo.logBossResult(id, 71)).toBe(75)
    expect(await repo.logBossResult(id, 72)).toBe(0)
    expect((await repo.totals()).xp).toBe(225)
  })
  it('re-entry inside 30 minutes earns a bonus; later does not', async () => {
    const a = await repo.addDrift('phone')
    clock += 10 * 60_000
    expect((await repo.completeReentry(a)).bonus).toBe(true)
    const b = await repo.addDrift('tired')
    clock += 45 * 60_000
    expect((await repo.completeReentry(b)).bonus).toBe(false)
  })
})

describe('export / import', () => {
  it('round-trips everything', async () => {
    await finishEverything()
    await repo.addFear({ situation: 's', afraid: 'a', predicted: 50, severity: 5, ifThen: 'x', checkBack: '2026-11-06' })
    const file = await repo.exportAll()
    expect(file.app).toBe('arise')
    const json = JSON.parse(JSON.stringify(file))
    const other = new Repo(new AriseDB(`test-${++n}`), () => clock)
    await other.init()
    await other.importAll(json)
    expect(await other.db.dayLogs.count()).toBe(1)
    expect(await other.db.fears.count()).toBe(1)
    expect((await other.totals()).xp).toBe((await repo.totals()).xp)
  })
  it('rejects garbage and leaves data untouched', async () => {
    await finishEverything()
    const before = (await repo.totals()).xp
    await expect(repo.importAll({ nope: 1 })).rejects.toThrow(/not an ARISE/i)
    await expect(repo.importAll(null)).rejects.toThrow()
    await expect(repo.importAll({ app: 'arise', schema: 99, data: {} })).rejects.toThrow(/newer/)
    await expect(repo.importAll({ app: 'arise', schema: 1, data: { settings: 'x' } })).rejects.toThrow(/malformed/)
    await expect(repo.importAll({ app: 'arise', schema: 1, data: {} })).rejects.toThrow(/settings/)
    expect((await repo.totals()).xp).toBe(before)
  })
  it('reset wipes all tables', async () => {
    await finishEverything()
    await repo.resetAll()
    expect(await repo.db.dayLogs.count()).toBe(0)
    expect(await repo.db.settings.count()).toBe(0)
  })
})
