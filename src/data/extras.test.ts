import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { AriseDB } from './db'
import { Repo } from './repo'
import { arise, completeHidden, guildReport, hiddenToday, icsText, listShadows, markBackup } from './extras'

let n = 0
let clock = 0
let repo: Repo
const at = (iso: string) => new Date(iso).getTime()

beforeEach(async () => {
  clock = at('2026-11-08T10:00:00+02:00') // Sunday
  repo = new Repo(new AriseDB(`x-${++n}`), () => clock)
  await repo.init()
})

describe('shadow army', () => {
  it('needs a resolved fear, is idempotent, awards XP once', async () => {
    const id = await repo.addFear({ situation: 's', afraid: "I'll blank in front of the class", predicted: 70, severity: 8, ifThen: 'x', checkBack: '2026-11-09' })
    expect(await arise(repo, id)).toBeNull()
    await repo.resolveFear(id, 'no', 'fine')
    const s1 = await arise(repo, id)
    const s2 = await arise(repo, id)
    expect(s1!.name).toMatch(/^Shadow of /)
    expect(s2!.id).toBe(s1!.id)
    expect(await listShadows(repo)).toHaveLength(1)
    expect((await repo.totals()).xp).toBe(40 + 32)
  })
})

describe('hidden quests', () => {
  it('none below Lv3; completion pays once', async () => {
    expect(await hiddenToday(repo, 2)).toEqual([])
    clock = at('2026-11-07T10:00:00+02:00') // Saturday: whole week is out
    const list = await hiddenToday(repo, 5)
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(await completeHidden(repo, list[0].id)).toBeGreaterThan(0)
    expect(await completeHidden(repo, list[0].id)).toBe(0)
    expect((await hiddenToday(repo, 5))[0].done).toBe(true)
  })
})

describe('guild report and backup', () => {
  it('builds a report, stores it, and sets the focus stat on Sunday', async () => {
    await repo.snapshot()
    const r = await guildReport(repo)
    expect(r.text).toContain('ARISE weekly report')
    expect(r.weekStart).toBe('2026-11-02')
    expect(await repo.db.weeklyReports.count()).toBe(1)
    expect((await repo.getPlayer()).weeklyFocusStat).toBe(r.focusStat)
    await guildReport(repo)
    expect(await repo.db.weeklyReports.count()).toBe(1)
  })
  it('records the backup day and builds an .ics', async () => {
    await markBackup(repo)
    expect((await repo.getSettings()).lastBackupDay).toBe('2026-11-08')
    expect(await icsText(repo)).toContain('BEGIN:VCALENDAR')
  })
})
