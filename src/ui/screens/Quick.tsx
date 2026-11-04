import { useState } from 'react'
import { repo } from '../../data'
import { sfx, LINES } from '../../audio'
import { Bar, Btn, Chip, Field, Rating, Screen, SystemWindow, CheckRow } from '../kit'
import { useUI } from '../store'

/** Morning check-in (15 s): sleep, energy, mood, pain -> HP / MP. */
export function CheckIn() {
  const act = useUI((s) => s.act)
  const back = useUI((s) => s.back)
  const [hours, setHours] = useState(7.5)
  const [quality, setQuality] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [mood, setMood] = useState<number | null>(null)
  const [pain, setPain] = useState(false)
  const [where, setWhere] = useState('')
  const [result, setResult] = useState<{ hp: number; mp: number; recovery: boolean } | null>(null)
  const ok = quality !== null && energy !== null && mood !== null

  async function submit() {
    if (!ok) return
    const r = await act(() => repo.checkIn({ sleepHours: hours, sleepQuality: quality!, energy: energy!, mood: mood!, pain, painWhere: pain ? where.trim() || undefined : undefined }))
    if (r.recovery) sfx.soft()
    setResult(r)
  }

  if (result) {
    return (
      <Screen title="CHECK-IN" onBack={back}>
        <div data-theme={result.recovery ? 'recovery' : undefined}>
          <SystemWindow title="VITALS" glow>
            <div className="space-y-3">
              <Bar kind="hp" value={result.hp} label="HP" right={`${result.hp}/100`} />
              <Bar kind="mp" value={result.mp} label="MP" right={`${result.mp}/100`} />
            </div>
            {result.recovery ? (
              <p className="mt-4 text-sm">
                <b>[RECOVERY PROTOCOL]</b> HP is low. Today's Body becomes mobility and a walk. It still counts as kept. Be kind to the engine.
              </p>
            ) : (
              <p className="mt-4 text-sm">Vitals logged. The quest stands as planned.</p>
            )}
            {pain && <p className="sys-dim mt-2 text-sm">Pain noted{where ? ` (${where})` : ''}. Train around it; no training when ill.</p>}
            <Btn variant="primary" big className="mt-5" onClick={back}>
              Continue
            </Btn>
          </SystemWindow>
        </div>
      </Screen>
    )
  }

  return (
    <Screen title="MORNING CHECK-IN" onBack={back}>
      <SystemWindow title="15 SECONDS">
        <div className="space-y-5">
          <Field label={`Hours slept: ${hours} h`}>
            <input type="range" min={0} max={12} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </Field>
          <Rating label="Sleep quality" value={quality} onChange={setQuality} labels={['awful', 'great']} />
          <Rating label="Energy" value={energy} onChange={setEnergy} labels={['drained', 'charged']} />
          <Rating label="Mood" value={mood} onChange={setMood} labels={['low', 'high']} />
          <div>
            <CheckRow label="Something hurts (pain)" checked={pain} onToggle={() => setPain((p) => !p)} />
            {pain && (
              <div className="mt-2">
                <input type="text" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Where? (e.g. lower back)" aria-label="Where does it hurt" />
              </div>
            )}
          </div>
        </div>
        <Btn variant="primary" big className="mt-5" disabled={!ok} onClick={() => void submit()}>
          Log vitals
        </Btn>
      </SystemWindow>
    </Screen>
  )
}

const ACTIVITIES = ['study', 'work', 'social', 'phone', 'rest', 'gym', 'other']

/** Pulse: energy, focus, mood, what, urge. <= 10 seconds, no typing. */
export function Pulse() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const back = useUI((s) => s.back)
  const [energy, setEnergy] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)
  const [mood, setMood] = useState<number | null>(null)
  const [activity, setActivity] = useState<string | null>(null)
  const [urge, setUrge] = useState<boolean | null>(null)
  const slot = (snap.pulseSlots.includes(2) ? 3 : 2) as 2 | 3
  const ok = energy !== null && focus !== null && mood !== null && activity && urge !== null

  return (
    <Screen title={`PULSE #${slot}`} onBack={back}>
      <SystemWindow title="10 SECONDS">
        <div className="space-y-5">
          <Rating label="Energy" value={energy} onChange={setEnergy} labels={['drained', 'charged']} />
          <Rating label="Focus" value={focus} onChange={setFocus} labels={['scattered', 'sharp']} />
          <Rating label="Mood" value={mood} onChange={setMood} labels={['low', 'high']} />
          <div>
            <label className="field">What are you doing?</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => (
                <Chip key={a} on={activity === a} onClick={() => setActivity(a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label className="field">Phone urge right now?</label>
            <div className="grid grid-cols-2 gap-2">
              <Chip on={urge === true} onClick={() => setUrge(true)}>
                Yes
              </Chip>
              <Chip on={urge === false} onClick={() => setUrge(false)}>
                No
              </Chip>
            </div>
          </div>
        </div>
        <Btn
          variant="primary"
          big
          className="mt-5"
          disabled={!ok}
          onClick={async () => {
            await act(() => repo.addPulse({ slot, energy: energy!, focus: focus!, mood: mood!, activity: activity!, urge: urge! }))
            sfx.tick()
            back()
          }}
        >
          Log pulse
        </Btn>
      </SystemWindow>
    </Screen>
  )
}

const CAUSES = ['phone', 'overthinking', 'too much on my plate', 'tired', 'people', 'unexpected event', 'chose something better']

/** I DRIFTED: tag the cause, then immediately Re-entry. */
export function Drift() {
  const replace = useUI((s) => s.replace)
  const back = useUI((s) => s.back)
  const [cause, setCause] = useState<string | null>(null)
  const [note, setNote] = useState('')
  return (
    <Screen title="I DRIFTED" onBack={back}>
      <SystemWindow title="NO SHAME. JUST DATA.">
        <p className="sys-dim mb-3 text-sm">Drifting is information. Tag the cause, then come straight back.</p>
        <div className="flex flex-wrap gap-2">
          {CAUSES.map((c) => (
            <Chip key={c} on={cause === c} onClick={() => setCause(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="mt-4">
          <Field label="Note (optional)">
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="One line" />
          </Field>
        </div>
        <Btn
          variant="primary"
          big
          className="mt-5"
          disabled={!cause}
          onClick={async () => {
            const id = await repo.addDrift(cause!, note.trim() || undefined)
            sfx.say(LINES.ret)
            replace({ name: 'reentry', driftId: id })
          }}
        >
          Return
        </Btn>
      </SystemWindow>
    </Screen>
  )
}
