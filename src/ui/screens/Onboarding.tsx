import { useState } from 'react'
import { sleepWindowMinutes } from '../../engine/day'
import { repo } from '../../data'
import { sfx, LINES } from '../../audio'
import { Btn, Chip, Field, SystemWindow } from '../kit'
import { useUI } from '../store'

const DAYS = [
  { n: 1, l: 'Mon' },
  { n: 2, l: 'Tue' },
  { n: 3, l: 'Wed' },
  { n: 4, l: 'Thu' },
  { n: 5, l: 'Fri' },
  { n: 6, l: 'Sat' },
  { n: 0, l: 'Sun' },
]

interface ExamRow {
  subject: string
  date: string
}

/** Pre-Awakening (~3 min): name, wake / lights-out, gym days, exams, last exam date. */
export default function Onboarding() {
  const refresh = useUI((s) => s.refresh)
  const load = useUI((s) => s.load)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('Sfundo')
  const [wakeWk, setWakeWk] = useState('08:00')
  const [wakeEnd, setWakeEnd] = useState('09:00')
  const [lights, setLights] = useState('00:00')
  const [gym, setGym] = useState<number[]>([1, 3, 4, 6])
  const [exams, setExams] = useState<ExamRow[]>([{ subject: '', date: '' }])
  const [lastExam, setLastExam] = useState('2026-11-26')
  const [lastTouched, setLastTouched] = useState(false)
  const [study, setStudy] = useState(120)
  const [busy, setBusy] = useState(false)

  const sleepOk = sleepWindowMinutes(lights, wakeWk) >= 420 && sleepWindowMinutes(lights, wakeEnd) >= 420
  const filled = exams.filter((e) => e.subject.trim() && e.date)
  const maxDate = filled.map((e) => e.date).sort().at(-1)
  const effectiveLast = lastTouched ? lastExam : (maxDate ?? lastExam)

  const setExam = (i: number, patch: Partial<ExamRow>) => setExams((xs) => xs.map((x, k) => (k === i ? { ...x, ...patch } : x)))

  async function finish() {
    setBusy(true)
    await repo.completeOnboarding({
      name: name.trim() || 'Sfundo',
      wakeWeekday: wakeWk,
      wakeWeekend: wakeEnd,
      lightsOut: lights,
      gymDays: gym,
      exams: filled.map((e) => ({ subject: e.subject, dateKey: e.date })),
      lastExamDay: effectiveLast,
      studyTargetMin: study,
    })
    sfx.arise()
    sfx.say(LINES.arrived)
    await refresh()
    await load() // re-run day-start announcements now that onboarding is done
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6 safe-top">
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold tracking-[0.4em] text-cyan">ARISE</h1>
        <p className="sys-dim mt-1 text-sm tracking-widest">[PRE-AWAKENING] · step {step + 1} of 3</p>
      </div>

      {step === 0 && (
        <SystemWindow title="PLAYER">
          <div className="space-y-4">
            <Field label="Name">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Wake · weekdays">
                <input type="time" value={wakeWk} onChange={(e) => setWakeWk(e.target.value)} />
              </Field>
              <Field label="Wake · weekends">
                <input type="time" value={wakeEnd} onChange={(e) => setWakeEnd(e.target.value)} />
              </Field>
            </div>
            <Field label="Lights-out (Shutdown deadline)">
              <input type="time" value={lights} onChange={(e) => setLights(e.target.value)} />
            </Field>
            {!sleepOk && <p className="text-sm text-danger">The System never schedules under 7 hours in bed. Move lights-out earlier or wake later.</p>}
            <div>
              <label className="field">Gym days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <Chip key={d.n} on={gym.includes(d.n)} onClick={() => setGym((g) => (g.includes(d.n) ? g.filter((x) => x !== d.n) : [...g, d.n]))}>
                    {d.l}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <Btn variant="primary" big className="mt-5" disabled={!sleepOk} onClick={() => setStep(1)}>
            Next
          </Btn>
        </SystemWindow>
      )}

      {step === 1 && (
        <SystemWindow title="BOSS RAIDS">
          <p className="sys-dim mb-3 text-sm">Each exam is a Boss Raid. Add subject and date. Your existing study blocks become the Dungeons.</p>
          <div className="space-y-3">
            {exams.map((e, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                <input type="text" placeholder="Subject (e.g. Statistics)" value={e.subject} onChange={(ev) => setExam(i, { subject: ev.target.value })} aria-label={`Exam ${i + 1} subject`} />
                <input type="date" value={e.date} onChange={(ev) => setExam(i, { date: ev.target.value })} aria-label={`Exam ${i + 1} date`} className="!w-[10.5rem]" />
              </div>
            ))}
            <Btn variant="ghost" onClick={() => setExams((x) => [...x, { subject: '', date: '' }])}>
              + Add exam
            </Btn>
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Last exam day (EXAM mode ends after it)">
              <input
                type="date"
                value={effectiveLast}
                onChange={(e) => {
                  setLastExam(e.target.value)
                  setLastTouched(true)
                }}
              />
            </Field>
            <Field label={`Daily study target: ${study} min`}>
              <input type="range" min={30} max={240} step={15} value={study} onChange={(e) => setStudy(Number(e.target.value))} />
            </Field>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={() => setStep(0)}>
              Back
            </Btn>
            <Btn variant="primary" onClick={() => setStep(2)}>
              Next
            </Btn>
          </div>
        </SystemWindow>
      )}

      {step === 2 && (
        <SystemWindow title="READY">
          <ul className="space-y-2 text-sm">
            <li>
              Player: <b>{name || 'Sfundo'}</b>
            </li>
            <li>
              Wake {wakeWk} (weekdays) · {wakeEnd} (weekends) · lights-out {lights}
            </li>
            <li>Gym: {DAYS.filter((d) => gym.includes(d.n)).map((d) => d.l).join(', ') || 'none'}</li>
            <li>Boss Raids: {filled.length ? filled.map((e) => `${e.subject} (${e.date})`).join(' · ') : 'none yet — add them later in More'}</li>
            <li>EXAM mode runs until {effectiveLast}. Then the Training Arc opens.</li>
          </ul>
          <p className="sys-dim mt-4 text-sm">Everything stays on this device. Nothing is sent anywhere.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Btn variant="ghost" onClick={() => setStep(1)}>
              Back
            </Btn>
            <Btn variant="primary" disabled={busy} onClick={finish}>
              ARISE
            </Btn>
          </div>
        </SystemWindow>
      )}
    </div>
  )
}
