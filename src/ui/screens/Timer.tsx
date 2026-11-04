import { useEffect, useMemo, useState } from 'react'
import { clockTs, wakeTimeFor } from '../../engine/day'
import { repo } from '../../data'
import { sfx } from '../../audio'
import { Btn, CheckRow, Chip, Field, Rating, Screen, SystemWindow, fmtClock, useNow, useWakeLock } from '../kit'
import { useUI } from '../store'

const IGNITION_SEC = 120
const STORE = 'arise.timer'

const SEED = [
  { k: 'Simplify', t: 'Write the idea in one plain sentence.' },
  { k: 'Expand', t: 'Add one example or one connection to something you know.' },
  { k: 'Explain back', t: 'Say it out loud as if teaching a friend. No notes.' },
  { k: 'Drill', t: 'Do three practice questions without looking.' },
]

interface Saved {
  key: string
  phase: 'ignition' | 'focus' | 'rating'
  subject: string
  plannedMin: number
  phoneAway: boolean
  interruptions: number
  phaseStart: number
  elapsedMin?: number
  startDelayMin?: number
}

function load(key: string): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Saved | null
    return s && s.key === key ? s : null
  } catch {
    return null
  }
}
function save(s: Saved | null) {
  try {
    if (s) localStorage.setItem(STORE, JSON.stringify(s))
    else localStorage.removeItem(STORE)
  } catch {
    /* fine */
  }
}

export default function Timer({ objectiveKey }: { objectiveKey: string }) {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const back = useUI((s) => s.back)
  const all = [...snap.log.quest.objectives, ...(snap.log.quest.penalty ? [snap.log.quest.penalty] : [])]
  const obj = all.find((o) => o.key === objectiveKey)
  const prog = snap.log.progress[objectiveKey]
  const remaining = obj ? Math.max(0, (obj.target ?? obj.minutes) - (prog?.value ?? 0)) : 0
  const isStudy = obj?.id === 'DUNGEONS' || obj?.id === 'COURSEWORK' || obj?.id === 'MAIN_QUEST'

  const [st, setSt] = useState<Saved | null>(() => load(objectiveKey))
  const [subject, setSubject] = useState('')
  const [planned, setPlanned] = useState(() => Math.min(Math.max(remaining, 10), 45) || 25)
  const [away, setAway] = useState(false)
  const [quality, setQuality] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const now = useNow(500)
  useWakeLock(st?.phase === 'ignition' || st?.phase === 'focus')

  const subjects = useMemo(() => [...snap.exams.map((e) => e.subject), 'Other'], [snap.exams])

  const update = (s: Saved | null) => {
    setSt(s)
    save(s)
  }

  // phase transitions driven by the clock
  useEffect(() => {
    if (!st) return
    if (st.phase === 'ignition' && now - st.phaseStart >= IGNITION_SEC * 1000) {
      sfx.soft()
      update({ ...st, phase: 'focus', phaseStart: Date.now() })
    }
    if (st.phase === 'focus' && now - st.phaseStart >= st.plannedMin * 60_000) {
      sfx.chime()
      update({ ...st, phase: 'rating', elapsedMin: st.plannedMin })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  if (!obj) {
    return (
      <Screen title="TIMER" onBack={back}>
        <p>That objective is no longer part of today's quest.</p>
      </Screen>
    )
  }

  function begin() {
    const wake = wakeTimeFor(snap.today, snap.settings.wakeWeekday, snap.settings.wakeWeekend)
    const delay = Math.round((Date.now() - clockTs(snap.today, wake)) / 60_000)
    update({
      key: objectiveKey,
      phase: 'ignition',
      subject: isStudy ? subject || 'Other' : '',
      plannedMin: planned,
      phoneAway: away,
      interruptions: 0,
      phaseStart: Date.now(),
      startDelayMin: delay >= 0 && delay < 16 * 60 ? delay : undefined,
    })
  }

  async function finish(minutes: number) {
    if (!st) return
    await act(() =>
      repo.logSession({
        objectiveKey,
        subject: st.subject || undefined,
        plannedMin: st.plannedMin,
        minutes,
        phoneAway: st.phoneAway,
        interruptions: st.interruptions,
        quality: quality ?? 3,
        note: note.trim() || undefined,
        startDelayMin: st.startDelayMin,
      }),
    )
    update(null)
    back()
  }

  const title = obj.title

  // ---------------------------------------------------------------- setup
  if (!st) {
    return (
      <Screen title="DUNGEON TIMER" onBack={back}>
        <SystemWindow title={title} glow>
          <p className="sys-dim text-sm">{obj.desc}</p>
          <p className="num mt-2 text-cyan">
            {Math.round(prog?.value ?? 0)}/{obj.target ?? obj.minutes} min logged
          </p>
          {isStudy && (
            <div className="mt-4">
              <label className="field">Subject</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <Chip key={s} on={subject === s} onClick={() => setSubject(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4">
            <label className="field">Block length</label>
            <div className="flex flex-wrap gap-2">
              {[15, 25, 45, 60, 90].map((m) => (
                <Chip key={m} on={planned === m} onClick={() => setPlanned(m)}>
                  {m} min
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <CheckRow label="Phone is in another room (+25 % XP)" checked={away} onToggle={() => setAway((a) => !a)} />
          </div>
          <Btn variant="primary" big className="mt-5" onClick={begin}>
            Start · 2-min ignition
          </Btn>
          <p className="sys-dim mt-3 text-center text-xs">Every block opens with a 2-minute ignition: open it, do one line.</p>
        </SystemWindow>
      </Screen>
    )
  }

  // ---------------------------------------------------------------- ignition
  if (st.phase === 'ignition') {
    const left = IGNITION_SEC - (now - st.phaseStart) / 1000
    return (
      <Screen title="IGNITION" onBack={undefined}>
        <SystemWindow title={title} glow className="text-center">
          <div className="num my-6 text-7xl text-cyan">{fmtClock(left)}</div>
          <p className="text-xl font-display tracking-wide">Open it. Do one line.</p>
          <p className="sys-dim mt-2 text-sm">Two minutes only. Starting is the whole job.</p>
          <Btn variant="primary" big className="mt-6" onClick={() => update({ ...st, phase: 'focus', phaseStart: Date.now() })}>
            I'm in — start focus
          </Btn>
          <Btn variant="ghost" className="mt-3 w-full" onClick={() => update(null)}>
            Cancel
          </Btn>
        </SystemWindow>
      </Screen>
    )
  }

  // ---------------------------------------------------------------- focus
  if (st.phase === 'focus') {
    const elapsed = (now - st.phaseStart) / 1000
    const left = st.plannedMin * 60 - elapsed
    const quarter = Math.min(3, Math.floor((elapsed / (st.plannedMin * 60)) * 4))
    return (
      <Screen title="FOCUS" onBack={undefined}>
        <SystemWindow title={st.subject ? `${title} · ${st.subject}` : title} glow className="text-center">
          <div className="num my-4 text-7xl text-cyan">{fmtClock(left)}</div>
          <div className="bar" aria-hidden>
            <i style={{ width: `${Math.min(100, (elapsed / (st.plannedMin * 60)) * 100)}%` }} />
          </div>
          <p className="sys-dim mt-2 text-xs">{st.phoneAway ? 'Phone away · ×1.25 XP' : 'Phone in reach'} · interruptions {st.interruptions}</p>
          <Btn className="mt-4 w-full" onClick={() => update({ ...st, interruptions: st.interruptions + 1 })}>
            Interrupted +1
          </Btn>
        </SystemWindow>

        {isStudy && (
          <SystemWindow title="SEED">
            <ul className="space-y-2">
              {SEED.map((s, i) => (
                <li key={s.k} className={`rounded-sm border p-2 text-sm ${i === quarter ? 'border-[var(--acc)] bg-[var(--acc-soft)]' : 'border-transparent opacity-50'}`}>
                  <b className="font-display tracking-widest">{s.k.toUpperCase()}</b> — {s.t}
                </li>
              ))}
            </ul>
          </SystemWindow>
        )}

        <Btn variant="primary" big onClick={() => update({ ...st, phase: 'rating', elapsedMin: Math.max(1, Math.round(elapsed / 60)) })}>
          Finish block
        </Btn>
        <Btn variant="ghost" onClick={() => update(null)}>
          Abandon (nothing logged)
        </Btn>
      </Screen>
    )
  }

  // ---------------------------------------------------------------- rating
  const minutes = st.elapsedMin ?? st.plannedMin
  return (
    <Screen title="BLOCK COMPLETE" onBack={undefined}>
      <SystemWindow title={title}>
        <div className="num text-5xl text-cyan">{minutes} min</div>
        <div className="mt-4 space-y-4">
          <Rating label="How was the focus?" value={quality} onChange={setQuality} labels={['scattered', 'locked in']} />
          <Field label="Note (optional)">
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="One line" />
          </Field>
        </div>
        <Btn variant="primary" big className="mt-5" disabled={quality === null} onClick={() => void finish(minutes)}>
          Log it
        </Btn>
      </SystemWindow>
    </Screen>
  )
}
