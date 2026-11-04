import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { AriseDB } from './db'
import { Repo } from './repo'
import {
  addGold, addOutreach, attemptRankExam, buy, clearBoss, completeChapter, completeEmergency, completeGate, courageState, emergencyToday, equipTitle, gateState, gateToday, goldState,
  jobFor, libraryState, logCourage, logReading, logScreenTime, purgeOldRecordings, rankExamState, saveAwakening, saveRecording, shopState, startGate, syncTitles, toggleCheckpoint,
} from './forge'

let n = 0
let clock = 0
let repo: Repo
const at = (iso: string) => new Date(iso).getTime()

beforeEach(async () => {
  clock = at('2026-12-01T10:00:00+02:00') // Tuesday, BREAK mode (default last exam 30 Nov)
  repo = new Repo(new AriseDB(`f-${++n}`), () => clock)
  await repo.init()
})

const aw = { maxPush: 30, maxSquat: 60, maxSit: 40, plankSec: 60, steps: 4000, screenMin: 300, lichess: 1200, fears: [{ label: 'Text my crush', rating: 95 }] }

describe('Full Awakening', () => {
  it('sets Trio at 50 % of max, steps +1,000, screen target -10 %, personal ladder', async () => {
    await saveAwakening(repo, aw)
    const p = await repo.getPlayer()
    expect(p.trio).toEqual({ push: 15, squat: 30, sit: 20, steps: 5000 })
    expect(p.screenTargetMin).toBe(270)
    expect(p.courageRungs).toHaveLength(10)
    expect(p.courageRungs).toContain('Text my crush')
    expect((await repo.totals()).xp).toBe(200)
  })
  it('the BREAK Daily Trio quest uses those targets on non-gym days', async () => {
    await saveAwakening(repo, aw)
    clock = at('2026-12-04T10:00:00+02:00') // Friday: not a gym day
    const log = await repo.ensureDay('2026-12-04')
    const body = log.quest.objectives.find((o) => o.id === 'BODY')!
    expect(body.items!.map((i) => i.label)).toEqual(['15 push-ups', '30 squats', '20 sit-ups', 'Walk to 5,000 steps'])
  })
  it('over-target screen time applies the SCROLL DEBUFF (-20 % FOC stat-XP)', async () => {
    await saveAwakening(repo, aw)
    const day = repo.today()
    await repo.updateProgress(day, 'STILLNESS', (p) => ({ ...p, value: 99 }))
    const base = (await repo.db.dayLogs.get(day))!.statXp.FOC
    expect(base).toBeGreaterThan(0)
    await logScreenTime(repo, 400)
    expect((await repo.db.dayLogs.get(day))!.statXp.FOC).toBeCloseTo(base * 0.8, 5)
    await logScreenTime(repo, 200)
    expect((await repo.db.dayLogs.get(day))!.statXp.FOC).toBeCloseTo(base, 5)
  })
})

describe('Skill Gates', () => {
  it('the System picks, practice minutes accrue, Boss clear grants the skill', async () => {
    const s = await startGate(repo)
    expect(s).not.toBeNull()
    expect(await startGate(repo)).toBeNull() // one at a time
    await repo.logSession({ objectiveKey: 'SKILL_GATE', plannedMin: 20, minutes: 20, phoneAway: false, interruptions: 0, quality: 4 })
    await repo.addValue(repo.today(), 'SKILL_GATE', 10)
    const st = await gateState(repo)
    expect(st.current!.minutes).toBe(30)
    await toggleCheckpoint(repo, st.current!.id!, 0)
    expect((await gateState(repo)).current!.checkpoints[0]).toBe(true)
    const def = await clearBoss(repo, st.current!.id!)
    expect(def!.id).toBe(s!.id)
    expect(await clearBoss(repo, st.current!.id!)).toBeNull()
    const after = await gateState(repo)
    expect(after.cleared).toHaveLength(1)
    expect(after.next!.id).not.toBe(s!.id)
  })
})

describe('Library, Courage, GOLD, Main Quest', () => {
  it('finishing a book gives bonus XP and advances the reading order', async () => {
    await logReading(repo, { book: 'Atomic Habits', minutes: 30, takeaway: 'x', finished: true })
    const lib = await libraryState(repo)
    expect(lib.finishedCount).toBe(1)
    expect(lib.next!.title).toBe('The Courage to Be Disliked')
    expect((await repo.totals()).xp).toBe(150)
  })
  it('courage attempts accumulate; rejections are wins', async () => {
    for (let i = 0; i < 5; i++) await logCourage(repo, 1, 'Greet 3 strangers', 70, 20, i === 0)
    const c = await courageState(repo)
    expect(c.level).toBe(2)
    expect(c.rejections).toBe(1)
  })
  it('GOLD ledger totals, best month, Main Quest chapters and outreach count', async () => {
    await addGold(repo, 1500, 'Landing page', true)
    clock = at('2027-01-10T10:00:00+02:00')
    await addGold(repo, 800, 'Fix', false)
    const g = await goldState(repo)
    expect(g.total).toBe(2300)
    expect(g.mq).toBe(1500)
    expect(g.bestMonth).toBe(1500)
    await completeChapter(repo, 'arsenal')
    await completeChapter(repo, 'arsenal')
    expect((await repo.getPlayer()).mqDone).toEqual(['arsenal'])
    expect(await addOutreach(repo, 50)).toBe(50)
    expect((await repo.getPlayer()).mqDone).toContain('hunt')
  })
})

describe('Rank Exam, titles, shop, job', () => {
  it('the exam is only available when capped, and passing needs every criterion', async () => {
    expect((await rankExamState(repo))!.available).toBe(false)
    await repo.db.events.add({ ts: clock, dayKey: repo.today(), source: 'x', label: 'x', xp: 7000 })
    const st = (await rankExamState(repo))!
    expect(st.available).toBe(true)
    expect(st.rank).toBe('D')
    expect(st.criteria.every((c) => c.met)).toBe(false)
    expect((await attemptRankExam(repo)).passed).toBe(false)
    expect((await repo.totals()).level.capped).toBe(true)
  })
  it('passing releases the banked level', async () => {
    await repo.db.events.add({ ts: clock, dayKey: repo.today(), source: 'x', label: 'x', xp: 7000 })
    for (let i = 1; i <= 26; i++) {
      const d = new Date(clock - i * 86_400_000).toISOString().slice(0, 10)
      const log = await repo.ensureDay(d)
      await repo.db.dayLogs.put({ ...log, outcome: 'COMPLETE', closed: true, kept: 5, total: 5, pct: 100 })
    }
    for (let i = 0; i < 5; i++) await repo.db.shadows.add({ ts: clock, name: `s${i}`, severity: 3 })
    await repo.db.skillGates.add({ skillId: 'learning', startDay: '2026-11-01', clearedDay: '2026-11-20', checkpoints: {} })
    await completeChapter(repo, 'arsenal')
    await completeChapter(repo, 'offer')
    await repo.db.assessments.add({ ts: 1, kind: 'ipip', result: { E: 3, A: 3, C: 3, N: 3, O: 3 } })
    await repo.db.assessments.add({ ts: 2, kind: 'values', result: ['a'] })
    for (let i = 0; i < 20; i++) await repo.db.motiveTags.add({ ts: 1, dayKey: '2026-11-01', objectiveKey: 'x', motive: i % 2 ? 'money' : 'mastery' })
    for (let i = 0; i < 10; i++) await repo.db.drifts.add({ ts: clock, dayKey: '2026-11-20', cause: 'phone' })
    expect(await repo.decoded()).toBeGreaterThanOrEqual(25)
    expect(await attemptRankExam(repo)).toEqual({ passed: true, rank: 'D' })
    expect((await repo.totals()).level.level).toBeGreaterThanOrEqual(10)
  })
  it('titles are awarded from real evidence and can be equipped', async () => {
    expect(await syncTitles(repo)).toEqual([])
    for (let i = 0; i < 10; i++) await repo.db.shadows.add({ ts: clock, name: `s${i}`, severity: 3 })
    expect(await syncTitles(repo)).toContain('fear-eater')
    expect(await syncTitles(repo)).toEqual([])
    await equipTitle(repo, 'fear-eater')
    expect((await repo.getPlayer()).equippedTitle).toBe('fear-eater')
  })
  it('shop spends essence and respects rank; no job before Lv25', async () => {
    expect(await jobFor(repo)).toBeNull()
    await repo.db.events.add({ ts: clock, dayKey: repo.today(), source: 'x', label: 'x', xp: 3000 })
    expect((await shopState(repo)).essence).toBe(300)
    expect(await buy(repo, 'gaming')).toBe(true)
    expect((await shopState(repo)).essence).toBe(150)
    expect(await buy(repo, 'gear')).toBe(false)
    expect(await buy(repo, 'nope')).toBe(false)
  })
})

describe('Emergency + Gates + recordings', () => {
  it('emergency quests need Lv8+, come about once a fortnight, and pay once', async () => {
    expect(await emergencyToday(repo)).toBeNull()
    await repo.db.events.add({ ts: clock, dayKey: '2026-12-01', source: 'x', label: 'x', xp: 20_000 })
    const start = at('2026-12-01T10:00:00+02:00')
    let found = 0
    for (let d = 0; d < 28; d++) {
      clock = start + d * 86_400_000
      await repo.snapshot()
      const q = await emergencyToday(repo)
      if (q) {
        found++
        expect(await completeEmergency(repo)).toBe(q.xp)
        expect(await completeEmergency(repo)).toBe(0)
      }
    }
    expect(found).toBeGreaterThanOrEqual(1)
    expect(found).toBeLessThanOrEqual(3)
  })
  it('Saturday Gates appear only after D-Rank', async () => {
    clock = at('2026-12-05T10:00:00+02:00') // Saturday
    await repo.snapshot()
    expect(await gateToday(repo)).toBeNull()
    await repo.savePlayer({ passedRanks: ['D'] })
    await repo.db.events.add({ ts: clock, dayKey: repo.today(), source: 'x', label: 'x', xp: 7000 })
    const g = await gateToday(repo)
    expect(g!.rank).toBe('D')
    expect(await completeGate(repo)).toBe(250)
    expect(await completeGate(repo)).toBe(0)
  })
  it('teach-back recordings are deleted after 30 days', async () => {
    await saveRecording(repo, new Blob(['x']), 120)
    clock += 31 * 86_400_000
    expect(await purgeOldRecordings(repo)).toBe(1)
    expect(await repo.db.recordings.count()).toBe(0)
  })
})
