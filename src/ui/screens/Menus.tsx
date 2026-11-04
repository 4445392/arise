import { useEffect, useRef, useState } from 'react'
import { LAWS } from '../../content/laws'
import { checkUnlock, type Feature } from '../../engine/unlocks'
import { INSIGHT_IDS } from '../../engine/insights'
import { sleepWindowMinutes } from '../../engine/day'
import { repo, requestPersist } from '../../data'
import type { JournalEntry } from '../../data/models'
import { LINES, sfx } from '../../audio'
import { Btn, CheckRow, Chip, Field, LockedCard, Screen, SystemWindow } from '../kit'
import { useUI } from '../store'

function useLock(feature: Feature) {
  const snap = useUI((s) => s.snap)!
  return checkUnlock(feature, { level: snap.totals.level.level, mode: snap.mode, rank: snap.totals.level.rank })
}

function Row({ title, hint, onClick }: { title: string; hint?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap-row !min-h-[60px] justify-between">
      <span>
        <span className="font-display text-lg font-bold tracking-wide">{title}</span>
        {hint && <span className="sys-dim block text-xs">{hint}</span>}
      </span>
      <span className="text-cyan">›</span>
    </button>
  )
}

// ============================================================ Mirror tab
export function Mirror() {
  const snap = useUI((s) => s.snap)!
  const open = useUI((s) => s.open)
  const manual = useLock('playerManual')
  const decision = useLock('decisionJournal')
  const lv = snap.totals.level.level
  return (
    <div className="flex flex-col gap-4">
      <SystemWindow title="THE MIRROR">
        <div className="flex items-end justify-between">
          <div>
            <div className="num text-5xl text-cyan">{snap.decoded}%</div>
            <div className="sys-dim text-xs tracking-widest">DECODED</div>
          </div>
          <p className="sys-dim max-w-[11rem] text-right text-xs">
            Each Pulse, journal and fear is a data point. Chapters of the Player Manual unlock as evidence builds. {INSIGHT_IDS.length} chapters in total.
          </p>
        </div>
      </SystemWindow>
      <Row title="Pulse" hint="Energy · focus · mood · 10 s" onClick={() => open({ name: 'pulse' })} />
      <Row title="Night Journal" hint="Your past entries" onClick={() => open({ name: 'journal' })} />
      <Row title="Fear Log" hint="Murphy's Law Debugger" onClick={() => open({ name: 'fear' })} />
      <Row title="Boss Raids" hint="Exams" onClick={() => open({ name: 'bosses' })} />
      {manual.locked ? <LockedCard title="PLAYER MANUAL" label={manual.label} hint={`Reach Lv.5 (you are Lv.${lv}). Chapters unlock from real data, with sample sizes.`} /> : <LockedCard title="PLAYER MANUAL" label="CHAPTERS LOCKED" hint="Needs more Pulses and sessions. The full Manual arrives with the Mirror update." />}
      <LockedCard title="EASY / HARD MAP" label="NEEDS 30 RATINGS" hint="Arrives with objective feedback." />
      <LockedCard title="THOUGHT AUDIT" label="WEEKLY · SUNDAY" hint="Arrives with the Guild Report." />
      {decision.locked && <LockedCard title="DECISION JOURNAL" label={decision.label} />}
    </div>
  )
}

// ============================================================ Skills tab
export function Skills() {
  const snap = useUI((s) => s.snap)!
  const locked = snap.mode === 'EXAM'
  return (
    <div className="flex flex-col gap-4">
      <SystemWindow title="THE FORGE">
        <p className="text-sm">
          {locked ? 'The Forge opens after the final boss. Until then your exams are the only dungeon that matters. Protect them.' : 'The Forge opens in the next update.'}
        </p>
      </SystemWindow>
      {['SKILL GATES', 'COURAGE LADDER', 'STRATEGY', 'MAIN QUEST I · FIRST BLOOD'].map((t) => (
        <LockedCard key={t} title={t} label="LOCKED — after the final boss" />
      ))}
    </div>
  )
}

// ============================================================ More tab
export function More() {
  const open = useUI((s) => s.open)
  const shop = useLock('shop')
  const titles = useLock('titles')
  return (
    <div className="flex flex-col gap-3">
      <h1 className="sys-title !text-lg">[MORE]</h1>
      <Row title="Boss Raids" hint="Exams, rituals, results" onClick={() => open({ name: 'bosses' })} />
      <Row title="Fear Log" onClick={() => open({ name: 'fear' })} />
      <Row title="Night Journal" onClick={() => open({ name: 'journal' })} />
      <Row title="Laws of the System" onClick={() => open({ name: 'laws' })} />
      <Row title="Settings & backup" hint="Times · export / import · reset" onClick={() => open({ name: 'settings' })} />
      <LockedCard title="SHOP" label={shop.locked ? shop.label : 'COMING'} />
      <LockedCard title="TITLES" label={titles.locked ? titles.label : 'COMING'} />
      <LockedCard title="HISTORY" label="COMING" hint="XP over time, stats radar, TRUST line." />
    </div>
  )
}

// ============================================================ Laws
export function Laws() {
  const back = useUI((s) => s.back)
  return (
    <Screen title="THE 7 LAWS" onBack={back}>
      {LAWS.map((l) => (
        <SystemWindow key={l.n} title={`LAW ${l.n}`}>
          <h3 className="font-display text-xl font-bold">{l.title}</h3>
          <p className="sys-dim mt-1 text-sm">{l.body}</p>
        </SystemWindow>
      ))}
    </Screen>
  )
}

// ============================================================ Night Journal history
export function Journal() {
  const back = useUI((s) => s.back)
  const [rows, setRows] = useState<JournalEntry[] | null>(null)
  useEffect(() => {
    void repo.db.journal.orderBy('dayKey').reverse().toArray().then(setRows)
  }, [])
  return (
    <Screen title="NIGHT JOURNAL" onBack={back}>
      {rows?.length === 0 && <p className="sys-dim text-sm">No entries yet. Shutdown writes them: three lines, under a minute.</p>}
      {rows?.map((r) => (
        <SystemWindow key={r.id} title={r.dayKey}>
          <p className="text-sm"><b className="text-cyan">Kept:</b> {r.kept}</p>
          <p className="mt-1 text-sm"><b className="text-cyan">Feared vs real:</b> {r.fear}</p>
          <p className="mt-1 text-sm"><b className="text-cyan">Lesson:</b> {r.lesson}</p>
          {r.nextBlock && <p className="sys-dim mt-1 text-xs">Next block: {r.nextBlock}</p>}
        </SystemWindow>
      ))}
    </Screen>
  )
}

// ============================================================ Settings
const DAYS = [
  { n: 1, l: 'Mon' },
  { n: 2, l: 'Tue' },
  { n: 3, l: 'Wed' },
  { n: 4, l: 'Thu' },
  { n: 5, l: 'Fri' },
  { n: 6, l: 'Sat' },
  { n: 0, l: 'Sun' },
]

export function Settings() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const back = useUI((s) => s.back)
  const s = snap.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [confirmReset, setConfirmReset] = useState('')
  const [pendingImport, setPendingImport] = useState<unknown>(null)

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const save = (patch: Parameters<typeof repo.saveSettings>[0]) =>
    act(async () => {
      await repo.saveSettings(patch)
      await repo.refreshQuest(snap.today)
    })

  const sleepOk = sleepWindowMinutes(s.lightsOut, s.wakeWeekday) >= 420 && sleepWindowMinutes(s.lightsOut, s.wakeWeekend) >= 420

  async function doExport() {
    const file = await repo.exportAll()
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `arise-backup-${snap.today}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    setMsg(`Backup downloaded (${Object.values(file.data).reduce((n, r) => n + (r?.length ?? 0), 0)} records). Keep it somewhere safe.`)
  }

  async function onFile(f: File | undefined) {
    if (!f) return
    try {
      const parsed = JSON.parse(await f.text())
      if (parsed?.app !== 'arise') throw new Error('Not an ARISE backup file.')
      setPendingImport(parsed)
      setMsg(null)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  return (
    <Screen title="SETTINGS" onBack={back}>
      <SystemWindow title="TIMES">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Wake · weekdays">
              <input type="time" value={s.wakeWeekday} onChange={(e) => void save({ wakeWeekday: e.target.value })} />
            </Field>
            <Field label="Wake · weekends">
              <input type="time" value={s.wakeWeekend} onChange={(e) => void save({ wakeWeekend: e.target.value })} />
            </Field>
          </div>
          <Field label="Lights-out">
            <input type="time" value={s.lightsOut} onChange={(e) => void save({ lightsOut: e.target.value })} />
          </Field>
          {!sleepOk && <p className="text-sm text-danger">Under 7 h in bed. The System never schedules that: adjust before relying on it.</p>}
          <div>
            <label className="field">Gym days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <Chip key={d.n} on={s.gymDays.includes(d.n)} onClick={() => void save({ gymDays: s.gymDays.includes(d.n) ? s.gymDays.filter((x) => x !== d.n) : [...s.gymDays, d.n] })}>
                  {d.l}
                </Chip>
              ))}
            </div>
          </div>
          <Field label={`Daily study target: ${s.studyTargetMin} min`}>
            <input type="range" min={30} max={240} step={15} value={s.studyTargetMin} onChange={(e) => void save({ studyTargetMin: Number(e.target.value) })} />
          </Field>
          <Field label="Last exam day (EXAM mode ends after it)">
            <input type="date" value={s.lastExamDay} onChange={(e) => e.target.value && void save({ lastExamDay: e.target.value })} />
          </Field>
          <Field label="University restart (Semester begins)">
            <input type="date" value={s.restartDay} onChange={(e) => e.target.value && void save({ restartDay: e.target.value })} />
          </Field>
        </div>
      </SystemWindow>

      <SystemWindow title="SOUND & VOICE">
        <div className="space-y-2">
          <CheckRow label="Sound effects" checked={s.sound} onToggle={() => void save({ sound: !s.sound }).then(() => s.sound || sfx.chime())} />
          <CheckRow label="Voice lines" checked={s.voice} onToggle={() => void save({ voice: !s.voice }).then(() => s.voice || sfx.say(LINES.arrived))} />
          <Btn variant="ghost" className="w-full" onClick={() => { sfx.chime(); sfx.say(LINES.arrived) }}>
            Test sound + voice
          </Btn>
        </div>
      </SystemWindow>

      <SystemWindow title="BACKUP">
        <p className="sys-dim text-sm">All data lives only on this device. Download a backup every Sunday. Clearing browser data or uninstalling the app erases it.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Btn variant="primary" onClick={() => void doExport()}>
            Export JSON
          </Btn>
          <Btn onClick={() => fileRef.current?.click()}>Import JSON</Btn>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        {pendingImport != null && (
          <div className="mt-3 sys p-3" data-theme="penalty">
            <p className="text-sm">Importing replaces ALL current data with the backup. This cannot be undone.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Btn variant="danger" onClick={async () => {
                try {
                  const r = await repo.importAll(pendingImport)
                  setMsg(`Imported ${r.rows} records.`)
                  setPendingImport(null)
                  await act(async () => undefined)
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : 'Import failed.')
                  setPendingImport(null)
                }
              }}>
                Replace data
              </Btn>
              <Btn variant="ghost" onClick={() => setPendingImport(null)}>
                Cancel
              </Btn>
            </div>
          </div>
        )}
        {msg && <p className="mt-3 text-sm text-cyan" role="status">{msg}</p>}
        <div className="mt-3 text-xs sys-dim">
          Storage protection: {persisted === null ? 'unknown' : persisted ? 'granted' : 'not granted'}.{' '}
          {persisted === false && (
            <button type="button" className="underline" onClick={() => void requestPersist().then(setPersisted)}>
              Request it
            </button>
          )}
        </div>
      </SystemWindow>

      <SystemWindow title="RESET">
        <p className="sys-dim text-sm">Erases everything on this device. Type RESET to unlock.</p>
        <input type="text" value={confirmReset} onChange={(e) => setConfirmReset(e.target.value)} className="mt-2" aria-label="Type RESET to confirm" autoCapitalize="characters" />
        <Btn
          variant="danger"
          className="mt-3 w-full"
          disabled={confirmReset !== 'RESET'}
          onClick={async () => {
            await repo.resetAll()
            try { localStorage.clear() } catch { /* ignore */ }
            location.reload()
          }}
        >
          Erase all data
        </Btn>
      </SystemWindow>
    </Screen>
  )
}
