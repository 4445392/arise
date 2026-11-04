import { useEffect, useRef, useState } from 'react'
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { calibration, disasterLine, type FearOutcome } from '../../engine/fear'
import { addDays } from '../../engine/day'
import { checkUnlock } from '../../engine/unlocks'
import { repo } from '../../data'
import type { FearEntry } from '../../data/models'
import { sfx, LINES } from '../../audio'
import { Btn, CheckRow, Chip, Field, LockedCard, Screen, SystemWindow, fmtClock, useNow } from '../kit'
import { startObjective } from '../actions'
import { useUI } from '../store'

// ============================================================ Re-entry
export function Reentry({ driftId }: { driftId: number }) {
  const snap = useUI((s) => s.snap)!
  const back = useUI((s) => s.back)
  const closeAll = useUI((s) => s.closeAll)
  const startedAt = useRef(Date.now())
  const now = useNow(500)
  const [result, setResult] = useState<{ minutes: number; bonus: boolean } | null>(null)
  const left = 120 - (now - startedAt.current) / 1000
  const next = snap.next

  async function ignite() {
    if (result) return
    const r = await repo.completeReentry(driftId)
    sfx.soft()
    setResult(r)
    void useUI.getState().refresh()
  }

  useEffect(() => {
    if (left <= 0 && !result) void ignite()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left <= 0])

  return (
    <Screen title="RE-ENTRY" onBack={back}>
      <SystemWindow title={LINES.ret.replace('.', '').toUpperCase()} glow className="text-center">
        {next ? (
          <>
            <div className="sys-dim text-xs tracking-widest">NEXT OBJECTIVE</div>
            <div className="font-display text-2xl font-bold">{next.title}</div>
            <p className="sys-dim mt-1 text-sm">{next.desc}</p>
          </>
        ) : (
          <p>Nothing left to do today. Rest.</p>
        )}
        {!result ? (
          <>
            <div className="num my-5 text-7xl text-cyan">{fmtClock(left)}</div>
            <p className="font-display text-xl tracking-wide">Open it. Do one line.</p>
            <Btn variant="primary" big className="mt-5" onClick={() => void ignite()}>
              I'm back in
            </Btn>
          </>
        ) : (
          <>
            <div className="num my-4 text-4xl text-cyan">{result.minutes} min</div>
            <p className="text-sm">{result.bonus ? 'Back within 30 minutes. +WIL. The Returner path grows.' : 'You came back. That is the skill.'}</p>
            {next && (
              <Btn
                variant="primary"
                big
                className="mt-5"
                onClick={() => {
                  closeAll()
                  setTimeout(() => startObjective(next), 0)
                }}
              >
                Go to {next.title}
              </Btn>
            )}
            <Btn variant="ghost" className="mt-3 w-full" onClick={closeAll}>
              Status
            </Btn>
          </>
        )}
      </SystemWindow>
    </Screen>
  )
}

// ============================================================ Shutdown / Night Journal
export function Shutdown() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const back = useUI((s) => s.back)
  const open = useUI((s) => s.open)
  const [j, setJ] = useState({ kept: '', fear: '', lesson: '', nextBlock: '' })
  const [loaded, setLoaded] = useState(false)
  const obj = snap.log.quest.objectives.find((o) => o.id === 'SHUTDOWN')
  const prog = snap.log.progress.SHUTDOWN ?? { items: [], value: 0 }
  const isExam = snap.mode === 'EXAM'

  useEffect(() => {
    void repo.journalFor(snap.today).then((e) => {
      if (e) setJ({ kept: e.kept, fear: e.fear, lesson: e.lesson, nextBlock: e.nextBlock ?? '' })
      setLoaded(true)
    })
  }, [snap.today])

  if (!obj) return null
  const pulsesDone = prog.items.includes('pulses')
  const slot3 = snap.pulseSlots.includes(3)

  async function saveJ() {
    await act(() => repo.saveJournal({ kept: j.kept, fear: j.fear, lesson: j.lesson, nextBlock: isExam ? j.nextBlock : undefined }))
  }

  return (
    <Screen title="SHUTDOWN" onBack={back}>
      <SystemWindow title="PROTECT THE ENGINE">
        <p className="sys-dim text-sm">Close the day. Four steps. Under three minutes.</p>
        <div className="mt-3 space-y-2">
          {obj.items!.map((i) => (
            <CheckRow key={i.id} label={i.label} checked={prog.items.includes(i.id)} onToggle={() => ['pulses', 'journal', 'next'].includes(i.id) || void act(() => repo.toggleItem(snap.today, 'SHUTDOWN', i.id))} />
          ))}
        </div>
      </SystemWindow>

      <SystemWindow title="1 · PULSE #3">
        {pulsesDone ? <p className="text-sm">Three Pulses logged today. ✓</p> : slot3 ? <p className="text-sm">Pulse #3 logged.</p> : (
          <Btn className="w-full" onClick={() => open({ name: 'pulse' })}>
            Log Pulse
          </Btn>
        )}
        {!pulsesDone && <p className="sys-dim mt-2 text-xs">Morning check-in is #1, after lunch #2, now #3.</p>}
      </SystemWindow>

      <SystemWindow title="2 · NIGHT JOURNAL">
        {loaded && (
          <div className="space-y-3">
            <Field label="Which promise did I keep that past-me wouldn't have?">
              <textarea rows={2} value={j.kept} onChange={(e) => setJ({ ...j, kept: e.target.value })} />
            </Field>
            <Field label="What did I fear today vs what actually happened?">
              <textarea rows={2} value={j.fear} onChange={(e) => setJ({ ...j, fear: e.target.value })} />
            </Field>
            <Field label="One lesson">
              <textarea rows={2} value={j.lesson} onChange={(e) => setJ({ ...j, lesson: e.target.value })} />
            </Field>
            {isExam && (
              <Field label="Tomorrow's first study block (name it)">
                <input type="text" value={j.nextBlock} onChange={(e) => setJ({ ...j, nextBlock: e.target.value })} placeholder="e.g. Stats — Chapter 4 past paper" />
              </Field>
            )}
            <Btn variant="primary" className="w-full" onClick={() => void saveJ()}>
              Save journal
            </Btn>
          </div>
        )}
      </SystemWindow>

      <SystemWindow title="3 · LIGHTS OUT">
        <p className="text-sm">
          Lights-out is {snap.settings.lightsOut}. Sleep is a quest. Tick "Lights out on time" above when the phone is down and the lights are off.
        </p>
      </SystemWindow>
    </Screen>
  )
}

// ============================================================ Fear Log
const OUTCOMES: { k: FearOutcome; l: string }[] = [
  { k: 'true', l: 'It came true' },
  { k: 'partly', l: 'Partly' },
  { k: 'no', l: "Didn't happen" },
  { k: 'better', l: 'Better than expected' },
]

export function FearLog({ examId, compose }: { examId?: number; compose?: boolean }) {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const back = useUI((s) => s.back)
  const [fears, setFears] = useState<FearEntry[]>([])
  const [composing, setComposing] = useState(!!compose)
  const [resolving, setResolving] = useState<FearEntry | null>(null)
  const exam = snap.exams.find((e) => e.id === examId)

  const reload = () => void repo.listFears().then(setFears)
  useEffect(reload, [snap.today, snap.log.kept])

  const cal = calibration(fears.map((f) => ({ id: f.id ?? 0, predicted: f.predicted, severity: f.severity, outcome: f.outcome })))
  const lock = checkUnlock('shadowArmy', { level: snap.totals.level.level, mode: snap.mode, rank: snap.totals.level.rank })

  if (composing) {
    return (
      <FearForm
        exam={exam}
        onCancel={() => (compose ? back() : setComposing(false))}
        onSaved={() => {
          reload()
          if (compose) back()
          else setComposing(false)
        }}
      />
    )
  }
  if (resolving) {
    return <Resolve fear={resolving} onDone={() => { setResolving(null); reload(); void act(async () => undefined) }} onCancel={() => setResolving(null)} />
  }

  return (
    <Screen title="FEAR LOG" onBack={back}>
      <SystemWindow title="MURPHY'S LAW DEBUGGER">
        <p className="text-lg font-display">{disasterLine(fears.map((f) => ({ id: f.id ?? 0, predicted: f.predicted, severity: f.severity, outcome: f.outcome })))}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="num text-2xl text-cyan">{cal.logged}</div>
            <div className="sys-dim text-[10px] tracking-widest">LOGGED</div>
          </div>
          <div>
            <div className="num text-2xl text-cyan">{cal.pctTrue === null ? '—' : `${Math.round(cal.pctTrue)}%`}</div>
            <div className="sys-dim text-[10px] tracking-widest">CAME TRUE</div>
          </div>
          <div>
            <div className="num text-2xl text-cyan">{cal.avgPredicted === null ? '—' : `${Math.round(cal.avgPredicted)}%`}</div>
            <div className="sys-dim text-[10px] tracking-widest">AVG PREDICTED</div>
          </div>
        </div>
        {cal.buckets.length > 0 && (
          <div className="mt-4 h-44" aria-label="Predicted versus actual">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cal.buckets.map((b) => ({ name: b.label, predicted: Math.round(b.avgPredicted), actual: Math.round(b.actual) }))}>
                <CartesianGrid stroke="#1b2a55" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#8fa6cf" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#8fa6cf" fontSize={11} width={28} />
                <Tooltip contentStyle={{ background: '#0a1330', border: '1px solid #2f7bff' }} />
                <RBar dataKey="predicted" fill="#4da3ff" name="predicted %" />
                <RBar dataKey="actual" fill="#5ee7ff" name="actual %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {cal.buckets.length === 0 && <p className="sys-dim mt-3 text-xs">Resolve a few fears and the calibration chart appears here: what you predicted vs what happened.</p>}
      </SystemWindow>

      <Btn variant="primary" big onClick={() => setComposing(true)}>
        New fear
      </Btn>

      <SystemWindow title="LOG">
        {fears.length === 0 && <p className="sys-dim text-sm">Nothing logged yet. Write the fear down: it shrinks on paper.</p>}
        <ul className="space-y-3">
          {fears.map((f) => {
            const due = !f.outcome && f.checkBack <= snap.today
            return (
              <li key={f.id} className="border-b border-[rgba(143,166,207,0.2)] pb-3">
                <div className="text-sm">
                  <b>I'm afraid that</b> {f.afraid}
                </div>
                <div className="sys-dim mt-1 text-xs">
                  {f.situation} · {f.predicted}% · severity {f.severity}/10 · check-back {f.checkBack}
                </div>
                <div className="mt-1 text-xs text-cyan">{f.ifThen}</div>
                {f.outcome ? (
                  <div className="mt-1 text-xs">Result: {OUTCOMES.find((o) => o.k === f.outcome)?.l}{f.whatHappened ? ` — ${f.whatHappened}` : ''}</div>
                ) : (
                  <Btn variant={due ? 'primary' : 'ghost'} className="mt-2 !min-h-[40px]" onClick={() => setResolving(f)}>
                    {due ? 'Check back now' : 'Resolve early'}
                  </Btn>
                )}
              </li>
            )
          })}
        </ul>
      </SystemWindow>

      {lock.locked ? (
        <LockedCard title="SHADOW ARMY" label={lock.label} hint="Every fear you beat becomes a Shadow." />
      ) : (
        <Btn variant="primary" onClick={() => useUI.getState().open({ name: 'shadows' })}>
          Shadow Army · ARISE resolved fears
        </Btn>
      )}
    </Screen>
  )
}

function FearForm({ exam, onCancel, onSaved }: { exam?: { id?: number; subject: string; dateKey: string }; onCancel: () => void; onSaved: () => void }) {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const [situation, setSituation] = useState(exam ? `${exam.subject} exam` : '')
  const [afraid, setAfraid] = useState('')
  const [pct, setPct] = useState(50)
  const [sev, setSev] = useState(5)
  const [ifx, setIfx] = useState('')
  const [thenx, setThenx] = useState('')
  const defaultCheck = exam ? addDays(exam.dateKey, 1) : addDays(snap.today, 3)
  const [check, setCheck] = useState(defaultCheck)
  const ok = situation.trim() && afraid.trim() && ifx.trim() && thenx.trim()

  return (
    <Screen title={exam ? `PRE-BOSS RITUAL` : 'NEW FEAR'} onBack={onCancel}>
      <SystemWindow title={exam ? exam.subject.toUpperCase() : 'DEFINE IT'}>
        <div className="space-y-4">
          <Field label="Situation">
            <input type="text" value={situation} onChange={(e) => setSituation(e.target.value)} />
          </Field>
          <Field label="I'm afraid that…">
            <textarea rows={2} value={afraid} onChange={(e) => setAfraid(e.target.value)} />
          </Field>
          <Field label={`Odds it happens: ${pct}%`}>
            <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
          </Field>
          <Field label={`How bad if it did: ${sev}/10`}>
            <input type="range" min={1} max={10} value={sev} onChange={(e) => setSev(Number(e.target.value))} />
          </Field>
          <div>
            <label className="field">If-then plan</label>
            <div className="grid grid-cols-[auto_1fr] items-center gap-2 text-sm">
              <span>If</span>
              <input type="text" value={ifx} onChange={(e) => setIfx(e.target.value)} placeholder="this happens" aria-label="If" />
              <span>then</span>
              <input type="text" value={thenx} onChange={(e) => setThenx(e.target.value)} placeholder="I will…" aria-label="Then" />
            </div>
          </div>
          <Field label="Check-back date (compare with reality)">
            <input type="date" value={check} onChange={(e) => setCheck(e.target.value)} />
          </Field>
        </div>
        <Btn
          variant="primary"
          big
          className="mt-5"
          disabled={!ok}
          onClick={async () => {
            await act(() => repo.addFear({ situation: situation.trim(), afraid: afraid.trim(), predicted: pct, severity: sev, ifThen: `If ${ifx.trim()}, I will ${thenx.trim()}`, checkBack: check, examId: exam?.id }))
            sfx.tick()
            onSaved()
          }}
        >
          Log fear
        </Btn>
        <p className="sys-dim mt-3 text-center text-xs">Fear is data. Predict it, log it, compare it with reality.</p>
      </SystemWindow>
    </Screen>
  )
}

function Resolve({ fear, onDone, onCancel }: { fear: FearEntry; onDone: () => void; onCancel: () => void }) {
  const [outcome, setOutcome] = useState<FearOutcome | null>(null)
  const [what, setWhat] = useState('')
  return (
    <Screen title="CHECK-BACK" onBack={onCancel}>
      <SystemWindow title="WHAT ACTUALLY HAPPENED?">
        <p className="text-sm">
          <b>I'm afraid that</b> {fear.afraid}
        </p>
        <p className="sys-dim mt-1 text-xs">You predicted {fear.predicted}%.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {OUTCOMES.map((o) => (
            <Chip key={o.k} on={outcome === o.k} onClick={() => setOutcome(o.k)}>
              {o.l}
            </Chip>
          ))}
        </div>
        <div className="mt-4">
          <Field label="One line: what happened">
            <input type="text" value={what} onChange={(e) => setWhat(e.target.value)} />
          </Field>
        </div>
        <Btn
          variant="primary"
          big
          className="mt-5"
          disabled={!outcome}
          onClick={async () => {
            await repo.resolveFear(fear.id!, outcome!, what.trim())
            onDone()
          }}
        >
          Record evidence
        </Btn>
      </SystemWindow>
    </Screen>
  )
}

// ============================================================ Boss Raids
export function Bosses() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const back = useUI((s) => s.back)
  const open = useUI((s) => s.open)
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState('')
  const [pct, setPct] = useState<Record<number, string>>({})

  return (
    <Screen title="BOSS RAIDS" onBack={back}>
      {snap.exams.length === 0 && <p className="sys-dim text-sm">No exams yet. Add one below.</p>}
      {snap.exams.map((e) => {
        const gap = Math.round((Date.parse(e.dateKey) - Date.parse(snap.today)) / 86_400_000)
        const past = gap <= 0
        return (
          <SystemWindow key={e.id} title={gap === 0 ? 'TODAY' : gap > 0 ? `T-${gap}d` : 'DEFEATED?'} right={<span className="num text-xs sys-dim">{e.dateKey}</span>}>
            <div className="font-display text-2xl font-bold">{e.subject}</div>
            {gap > 0 && gap <= 2 && (
              <Btn className="mt-3 w-full" onClick={() => open({ name: 'fear', examId: e.id, compose: true })}>
                Pre-Boss Ritual · log your fear
              </Btn>
            )}
            {past && !e.showedUp && (
              <Btn variant="primary" className="mt-3 w-full" onClick={() => void act(() => repo.confirmBossShowUp(e.id!)).then((xp) => xp && sfx.levelUp())}>
                I showed up · +150 XP
              </Btn>
            )}
            {e.showedUp && (
              <div className="mt-3">
                <div className="text-sm text-cyan">Showed up. ✓</div>
                {e.resultPct != null ? (
                  <div className="num mt-1 text-xl">Result: {e.resultPct}%</div>
                ) : (
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <input type="number" inputMode="numeric" min={0} max={100} placeholder="Result % (when you know)" value={pct[e.id!] ?? ''} onChange={(ev) => setPct({ ...pct, [e.id!]: ev.target.value })} aria-label="Result percent" />
                    <Btn disabled={!pct[e.id!]} onClick={() => void act(() => repo.logBossResult(e.id!, Number(pct[e.id!])))}>
                      Log · +75
                    </Btn>
                  </div>
                )}
              </div>
            )}
            <Btn variant="ghost" className="mt-3 w-full !min-h-[40px]" onClick={() => void act(() => repo.removeExam(e.id!))}>
              Remove
            </Btn>
          </SystemWindow>
        )
      })}
      <SystemWindow title="ADD BOSS">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Exam date" className="!w-[10.5rem]" />
        </div>
        <Btn
          variant="primary"
          className="mt-3 w-full"
          disabled={!subject.trim() || !date}
          onClick={async () => {
            await act(async () => {
              await repo.addExam(subject, date)
              await repo.refreshQuest(snap.today)
            })
            setSubject('')
            setDate('')
          }}
        >
          Add Boss Raid
        </Btn>
      </SystemWindow>
      <p className="sys-dim text-xs">XP for showing up. Bonus XP when you log the result later. Winning isn't required — presence is.</p>
    </Screen>
  )
}
