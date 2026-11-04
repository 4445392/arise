import { useEffect, useRef, useState } from 'react'
import { CODEX_LINKS, type Resource } from '../../content/skills'
import { COURAGE_RULES, LIBRARY, MAIN_QUEST_I, MONEY_MILESTONES } from '../../content/forge'
import { addDays } from '../../engine/day'
import { TITLES, assignJob, rejectionsCollected, skillRank, JOBS } from '../../engine/forge'
import { checkUnlock } from '../../engine/unlocks'
import { repo } from '../../data'
import {
  addGold, addOutreach, attemptRankExam, buy, clearBoss, completeChapter, completeEmergency, completeGate, courageState, emergencyToday, equipTitle, gateState, gateToday, goldState,
  libraryState, logCourage, logReading, logScreenTime, rankExamState, saveAwakening, saveRecording, shopState, startGate, syncTitles, toggleCheckpoint, updatePuzzleRating,
  type TimedState,
} from '../../data/forge'
import { sfx } from '../../audio'
import { Bar, Btn, CheckRow, Field, LockedCard, Screen, SystemWindow, fmtClock, useNow } from '../kit'
import { useUI } from '../store'

type Await<T> = T extends Promise<infer U> ? U : T
const lvl = () => {
  const s = useUI.getState().snap!
  return { level: s.totals.level.level, mode: s.mode, rank: s.totals.level.rank }
}

function Links({ items }: { items: Resource[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((r) => (
        <li key={r.title}>
          {r.url ? (
            <a className="text-cyan underline" href={r.url} target="_blank" rel="noreferrer noopener">
              {r.title}
            </a>
          ) : (
            <span className="text-cyan">{r.title}</span>
          )}
          <span className="sys-dim block text-xs">{r.why}</span>
          {!r.url && r.search && <span className="sys-dim block text-[11px]">Search: “{r.search}”</span>}
        </li>
      ))}
    </ul>
  )
}

// ============================================================ Skills tab (the Forge hub)
export function SkillsTab() {
  const snap = useUI((s) => s.snap)!
  const open = useUI((s) => s.open)
  const act = useUI((s) => s.act)
  const [gs, setGs] = useState<Await<ReturnType<typeof gateState>> | null>(null)
  const [confirm, setConfirm] = useState(false)
  const reload = () => void gateState(repo).then(setGs)
  useEffect(reload, [snap.today, snap.totals.xp])
  const locked = snap.mode === 'EXAM'
  const awakened = snap.player.awakened
  const sig = checkUnlock('signatureSkills', lvl())

  if (locked) {
    return (
      <div className="flex flex-col gap-4">
        <SystemWindow title="THE FORGE">
          <p className="text-sm">The Forge opens after the final boss. Until then your exams are the only dungeon that matters. Protect them.</p>
        </SystemWindow>
        {['SKILL GATES', 'COURAGE LADDER', 'STRATEGY', 'MAIN QUEST I · FIRST BLOOD'].map((t) => (
          <LockedCard key={t} title={t} label="LOCKED — after the final boss" />
        ))}
      </div>
    )
  }
  const cur = gs?.current
  return (
    <div className="flex flex-col gap-4">
      {!awakened && (
        <SystemWindow title="FULL AWAKENING" glow>
          <p className="text-sm">Day 0 of the Training Arc: baselines, fears, personality, values. About 45 minutes, can be split across the day.</p>
          <Btn variant="primary" big className="mt-3" onClick={() => open({ name: 'awakening' })}>
            Begin
          </Btn>
        </SystemWindow>
      )}

      {cur ? (
        <SystemWindow title="SKILL GATE" right={<span className="num text-xs text-cyan">RANK {skillRank(cur.minutes / 60)}</span>}>
          <h3 className="font-display text-2xl font-bold">{cur.def.name}</h3>
          <p className="sys-dim text-xs">Trains {cur.def.stats.join(' · ')} · started {cur.startDay}</p>
          <div className="mt-3">
            <Bar value={cur.minutes / 60} max={20} label="HOURS (target ~20)" right={`${(cur.minutes / 60).toFixed(1)} h`} />
          </div>
          <h4 className="sys-title mt-4 !text-xs">SKILL MAP</h4>
          <p className="text-sm">{cur.def.subSkills.join(' · ')}</p>
          <h4 className="sys-title mt-4 !text-xs">CHECKPOINTS</h4>
          <div className="mt-2 space-y-2">
            {cur.def.checkpoints.map((c, i) => (
              <CheckRow key={c} label={c} checked={!!cur.checkpoints[i]} onToggle={() => void toggleCheckpoint(repo, cur.id!, i).then(reload)} />
            ))}
          </div>
          <h4 className="sys-title mt-4 !text-xs">RESOURCES</h4>
          <Links items={cur.def.resources} />
          {cur.def.note && <p className="mt-3 text-xs text-gold">{cur.def.note}</p>}
          <h4 className="sys-title mt-4 !text-xs">BOSS TEST</h4>
          <p className="text-sm">{cur.def.bossTest}</p>
          {!confirm ? (
            <Btn variant="primary" className="mt-3 w-full" onClick={() => setConfirm(true)}>
              Boss Test cleared
            </Btn>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn
                variant="primary"
                onClick={async () => {
                  const d = await act(() => clearBoss(repo, cur.id!))
                  setConfirm(false)
                  if (d) {
                    sfx.levelUp()
                    useUI.getState().notify({ kind: 'levelup', title: 'NEW SKILL ACQUIRED', body: `${d.name} Lv.1` })
                  }
                  reload()
                }}
              >
                Yes, it's done
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirm(false)}>
                Not yet
              </Btn>
            </div>
          )}
        </SystemWindow>
      ) : gs?.next ? (
        <SystemWindow title="NEXT SKILL GATE" glow>
          <p className="sys-dim text-xs">The System picks: of the next 3 in the queue, the one that trains your weakest stat.</p>
          <h3 className="font-display text-2xl font-bold">{gs.next.name}</h3>
          <p className="text-sm">Trains {gs.next.stats.join(' · ')}. About 20 hours over a month: 40 minutes a day.</p>
          <Btn variant="primary" big className="mt-3" onClick={() => void act(() => startGate(repo)).then(reload)}>
            Open the Gate
          </Btn>
        </SystemWindow>
      ) : (
        <p className="sys-dim text-sm">All 14 Skill Gates cleared.</p>
      )}

      {gs && gs.cleared.length > 0 && (
        <SystemWindow title="SKILLS ACQUIRED">
          <ul className="space-y-1 text-sm">
            {gs.cleared.map((c) => (
              <li key={c.skillId} className="flex justify-between">
                <span>{c.def.name}</span>
                <span className="num text-cyan">
                  {skillRank(c.minutes / 60)} · {(c.minutes / 60).toFixed(1)} h
                </span>
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}
      {sig.locked ? (
        <LockedCard title="SIGNATURE SKILLS" label={sig.label} hint="After 5 Skill Gates, the Mirror nominates 1–2 from evidence." />
      ) : null}

      <h2 className="sys-title">[THE FORGE]</h2>
      {[
        ['Library', "The System's reading order", 'library'],
        ['Courage Ladder', 'Graded exposure to judgement', 'courage'],
        ['Main Quest I · First Blood', 'R10,000 from new clients', 'mainquest'],
        ['Rank Exam', 'Real-world proof to advance', 'rankexam'],
        ['Titles & Job', 'Earned, never chosen', 'titles'],
        ['Shop', 'Spend Essence on rewards', 'shop'],
      ].map(([t, h, name]) => (
        <button key={name} type="button" className="tap-row !min-h-[60px] justify-between" onClick={() => open({ name } as never)}>
          <span>
            <span className="font-display text-lg font-bold tracking-wide">{t}</span>
            <span className="sys-dim block text-xs">{h}</span>
          </span>
          <span className="text-cyan">›</span>
        </button>
      ))}
    </div>
  )
}

// ============================================================ Full Awakening
const SETUP = [
  'Put ARISE in the dock spot of your most-used social app',
  'Move social apps into a folder on the last home screen',
  'Turn on grayscale / bedtime mode after 22:00',
  'Turn off non-essential notifications',
]

export function FullAwakening() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const open = useUI((s) => s.open)
  const [f, setF] = useState({ maxPush: '', maxSquat: '', maxSit: '', plank: '', steps: '', screen: '', lichess: '' })
  const [fears, setFears] = useState(Array.from({ length: 10 }, () => ({ label: '', rating: 50 })))
  const [setup, setSetup] = useState<string[]>([])
  const num = (s: string) => Number(s) || 0
  const ok = num(f.maxPush) > 0 && num(f.screen) > 0 && num(f.lichess) > 0
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <Screen title="FULL AWAKENING" onBack={back}>
      <SystemWindow title="1 · PHYSICAL TEST">
        <p className="sys-dim mb-3 text-sm">Stop at any pain. Max reps with good form. Squats and sit-ups: 2 minutes each.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max push-ups"><input type="number" inputMode="numeric" value={f.maxPush} onChange={set('maxPush')} /></Field>
          <Field label="Squats in 2 min"><input type="number" inputMode="numeric" value={f.maxSquat} onChange={set('maxSquat')} /></Field>
          <Field label="Sit-ups in 2 min"><input type="number" inputMode="numeric" value={f.maxSit} onChange={set('maxSit')} /></Field>
          <Field label="Plank (seconds)"><input type="number" inputMode="numeric" value={f.plank} onChange={set('plank')} /></Field>
          <Field label="Today's steps"><input type="number" inputMode="numeric" value={f.steps} onChange={set('steps')} /></Field>
        </div>
      </SystemWindow>
      <SystemWindow title="2 · PHONE & CHESS BASELINE">
        <div className="space-y-3">
          <Field label="Average daily screen time (minutes) — from Digital Wellbeing / Screen Time">
            <input type="number" inputMode="numeric" value={f.screen} onChange={set('screen')} />
          </Field>
          <Field label="Lichess puzzle rating (lichess.org/training)">
            <input type="number" inputMode="numeric" value={f.lichess} onChange={set('lichess')} />
          </Field>
        </div>
      </SystemWindow>
      <SystemWindow title="3 · FEAR INVENTORY">
        <p className="sys-dim mb-3 text-sm">List up to 10 things you avoid because of what people might think. Rate each 0–100. They become your personal Courage rungs.</p>
        <div className="space-y-3">
          {fears.map((x, i) => (
            <div key={i}>
              <input type="text" placeholder={`Thing I avoid #${i + 1}`} value={x.label} onChange={(e) => setFears(fears.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} aria-label={`Fear ${i + 1}`} />
              {x.label && (
                <input type="range" min={0} max={100} step={5} value={x.rating} onChange={(e) => setFears(fears.map((y, j) => (j === i ? { ...y, rating: Number(e.target.value) } : y)))} aria-label={`Rating ${x.rating}`} />
              )}
            </div>
          ))}
        </div>
      </SystemWindow>
      <SystemWindow title="4 · THE MIRROR">
        <div className="grid gap-2">
          <Btn onClick={() => open({ name: 'ipip' })}>IPIP-50 personality (≈ 8 min)</Btn>
          <Btn onClick={() => open({ name: 'values' })}>Values card sort</Btn>
          <Btn onClick={() => open({ name: 'becoming' })}>Who I'm becoming</Btn>
        </div>
      </SystemWindow>
      <SystemWindow title="5 · PHONE SETUP QUEST">
        <div className="space-y-2">
          {SETUP.map((s) => (
            <CheckRow key={s} label={s} checked={setup.includes(s)} onToggle={() => setSetup(setup.includes(s) ? setup.filter((x) => x !== s) : [...setup, s])} />
          ))}
        </div>
      </SystemWindow>
      <Btn
        variant="primary"
        big
        disabled={!ok}
        onClick={async () => {
          await act(() => saveAwakening(repo, { maxPush: num(f.maxPush), maxSquat: num(f.maxSquat), maxSit: num(f.maxSit), plankSec: num(f.plank), steps: num(f.steps) || 3000, screenMin: num(f.screen), lichess: num(f.lichess), fears: fears.filter((x) => x.label.trim()) }))
          sfx.arise()
          useUI.getState().notify({ kind: 'system', title: '[AWAKENED]', body: 'Baselines recorded. Your Daily Trio, steps and screen-time targets are set from your own numbers. The Training Arc begins at about half load.', cta: 'Begin' })
          back()
        }}
      >
        Complete the Awakening
      </Btn>
    </Screen>
  )
}

// ============================================================ Library
export function LibraryScreen() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [st, setSt] = useState<Await<ReturnType<typeof libraryState>> | null>(null)
  const [book, setBook] = useState('')
  const [mins, setMins] = useState('')
  const [take, setTake] = useState('')
  const [fin, setFin] = useState(false)
  const reload = () => void libraryState(repo).then((s) => { setSt(s); setBook((b) => b || s.next?.title || '') })
  useEffect(reload, [])
  return (
    <Screen title="LIBRARY" onBack={back}>
      <SystemWindow title="LOG READING">
        <p className="sys-dim mb-2 text-sm">Audiobooks count. Drive time is training time.</p>
        <div className="space-y-3">
          <select value={book} onChange={(e) => setBook(e.target.value)} aria-label="Book">
            {LIBRARY.map((b) => <option key={b.title}>{b.title}</option>)}
          </select>
          <Field label="Minutes"><input type="number" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} /></Field>
          <Field label="One-line takeaway"><input type="text" value={take} onChange={(e) => setTake(e.target.value)} /></Field>
          <CheckRow label="I finished this book (bonus XP; then a 2-min Teach-back)" checked={fin} onToggle={() => setFin(!fin)} />
        </div>
        <Btn variant="primary" big className="mt-4" disabled={!Number(mins) || !take.trim()} onClick={async () => { await act(() => logReading(repo, { book, minutes: Number(mins), takeaway: take.trim(), finished: fin })); setMins(''); setTake(''); setFin(false); reload() }}>Log</Btn>
      </SystemWindow>
      <SystemWindow title="READING ORDER" right={<span className="num text-cyan">{st?.finishedCount ?? 0}/{LIBRARY.length}</span>}>
        <ol className="space-y-2 text-sm">
          {st?.books.map((b, i) => (
            <li key={b.title} className={b.finished ? 'text-cyan' : st.next?.title === b.title ? 'font-bold' : 'sys-dim'}>
              {i + 1}. {b.title} <span className="text-xs">— {b.author}{b.minutes ? ` · ${b.minutes} min` : ''}{b.finished ? ' ✓' : ''}</span>
            </li>
          ))}
        </ol>
      </SystemWindow>
      {st && st.logs.length > 0 && (
        <SystemWindow title="RECENT">
          {st.logs.map((l) => <p key={l.id} className="mb-2 text-sm"><b>{l.book}</b> · {l.minutes} min<span className="sys-dim block text-xs">{l.takeaway}</span></p>)}
        </SystemWindow>
      )}
    </Screen>
  )
}

// ============================================================ Courage Ladder
export function CourageScreen() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [st, setSt] = useState<Await<ReturnType<typeof courageState>> | null>(null)
  const [before, setBefore] = useState(60)
  const [after, setAfter] = useState(30)
  const [rej, setRej] = useState(false)
  const reload = () => void courageState(repo).then(setSt)
  useEffect(reload, [])
  if (!st) return <Screen title="COURAGE LADDER" onBack={back}><p className="sys-dim">Loading…</p></Screen>
  const rung = st.rungs[st.level - 1]
  const here = st.attempts.filter((a) => a.rung === st.level)
  const good = here.filter((a) => a.fearAfter < 40).length
  return (
    <Screen title="COURAGE LADDER" onBack={back}>
      <SystemWindow title={`RUNG ${st.level} OF ${st.rungs.length}`} glow>
        <h3 className="font-display text-xl font-bold">{rung}</h3>
        <div className="mt-2"><Bar value={good} max={5} label="TO ADVANCE: 5 attempts, fear after < 40" right={`${good}/5`} /></div>
        <div className="mt-4 space-y-3">
          <Field label={`Fear before: ${before}/100`}><input type="range" min={0} max={100} step={5} value={before} onChange={(e) => setBefore(Number(e.target.value))} /></Field>
          <Field label={`Fear after: ${after}/100`}><input type="range" min={0} max={100} step={5} value={after} onChange={(e) => setAfter(Number(e.target.value))} /></Field>
          <CheckRow label="They said no (a rejection is a WIN)" checked={rej} onToggle={() => setRej(!rej)} />
        </div>
        <Btn variant="primary" big className="mt-4" onClick={async () => { await act(() => logCourage(repo, st.level, rung, before, after, rej)); setRej(false); reload() }}>Log attempt</Btn>
        <p className="sys-dim mt-3 text-xs">{COURAGE_RULES}</p>
      </SystemWindow>
      <SystemWindow title="REJECTIONS COLLECTED"><div className="num text-4xl text-cyan">{rejectionsCollected(st.attempts)}</div></SystemWindow>
      <SystemWindow title="THE LADDER">
        <ol className="space-y-1 text-sm">
          {st.rungs.map((r, i) => <li key={r} className={i + 1 < st.level ? 'text-cyan' : i + 1 === st.level ? 'font-bold' : 'sys-dim'}>{i + 1}. {r}{i + 1 < st.level ? ' ✓' : ''}</li>)}
        </ol>
      </SystemWindow>
      <SystemWindow title="CODEX"><Links items={CODEX_LINKS} /></SystemWindow>
    </Screen>
  )
}

// ============================================================ Main Quest I + GOLD
export function MainQuestScreen() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const snap = useUI((s) => s.snap)!
  const [g, setG] = useState<Await<ReturnType<typeof goldState>> | null>(null)
  const [amt, setAmt] = useState('')
  const [src, setSrc] = useState('')
  const [mq, setMq] = useState(true)
  const reload = () => void goldState(repo).then(setG)
  useEffect(reload, [])
  const done = snap.player.mqDone ?? []
  const idx = MAIN_QUEST_I.chapters.findIndex((c) => !done.includes(c.id))
  const ch = idx >= 0 ? MAIN_QUEST_I.chapters[idx] : null
  return (
    <Screen title="MAIN QUEST I" onBack={back}>
      <SystemWindow title={MAIN_QUEST_I.title.toUpperCase()}>
        <p className="text-sm">{MAIN_QUEST_I.goal}</p>
        <div className="mt-3"><Bar value={g?.mq ?? 0} max={MAIN_QUEST_I.targetZar} label="NEW-CLIENT REVENUE" right={`R${(g?.mq ?? 0).toLocaleString()} / R10,000`} /></div>
      </SystemWindow>
      {ch ? (
        <SystemWindow title={`CHAPTER ${idx + 1}: ${ch.name.toUpperCase()}`} glow>
          <p className="text-sm">{ch.desc}</p>
          {ch.id === 'hunt' ? (
            <>
              <div className="mt-3"><Bar value={snap.player.mqOutreach ?? 0} max={50} label="CONVERSATIONS" right={`${snap.player.mqOutreach ?? 0}/50`} /></div>
              <Btn variant="primary" className="mt-3 w-full" onClick={() => void act(() => addOutreach(repo, 1))}>+1 conversation logged</Btn>
              <p className="sys-dim mt-2 text-xs">Honest, respectful outreach only. A "no" is a win.</p>
            </>
          ) : (
            <Btn variant="primary" className="mt-3 w-full" onClick={() => void act(() => completeChapter(repo, ch.id))}>Chapter cleared</Btn>
          )}
        </SystemWindow>
      ) : <SystemWindow title="COMPLETE"><p className="text-sm">All chapters cleared. Main Quest II is chosen at the February System Update from your data.</p></SystemWindow>}
      <SystemWindow title="GOLD LEDGER" right={<span className="num text-gold">R{(g?.total ?? 0).toLocaleString()}</span>}>
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <input type="number" inputMode="numeric" placeholder="Amount (R)" value={amt} onChange={(e) => setAmt(e.target.value)} aria-label="Amount in rand" />
          <input type="text" placeholder="Source" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="Source" />
        </div>
        <div className="mt-2"><CheckRow label="From a NEW client (counts toward Main Quest I)" checked={mq} onToggle={() => setMq(!mq)} /></div>
        <Btn variant="primary" className="mt-3 w-full" disabled={!Number(amt) || !src.trim()} onClick={async () => { await act(() => addGold(repo, Number(amt), src.trim(), mq)); setAmt(''); setSrc(''); reload() }}>Log income</Btn>
        <ul className="mt-3 space-y-1 text-sm">
          {g?.rows.slice(0, 8).map((r) => <li key={r.id} className="flex justify-between"><span>{r.source} <span className="sys-dim text-xs">{r.dayKey}</span></span><span className="num text-gold">R{r.amountZar.toLocaleString()}</span></li>)}
        </ul>
      </SystemWindow>
      <SystemWindow title="MONEY MILESTONES">
        <ul className="space-y-1 text-sm">{MONEY_MILESTONES.map(([r, t]) => <li key={r}><b className="text-cyan">{r}</b> · {t}</li>)}</ul>
        <p className="sys-dim mt-2 text-xs">Best month so far: R{(g?.bestMonth ?? 0).toLocaleString()}</p>
      </SystemWindow>
    </Screen>
  )
}

// ============================================================ Rank Exam
export function RankExamScreen() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [st, setSt] = useState<Await<ReturnType<typeof rankExamState>>>(null)
  const [msg, setMsg] = useState('')
  const reload = () => void rankExamState(repo).then(setSt)
  useEffect(reload, [])
  if (!st) return <Screen title="RANK EXAM" onBack={back}><p className="sys-dim">Loading…</p></Screen>
  return (
    <Screen title={`${st.rank}-RANK EXAM`} onBack={back}>
      <SystemWindow title={st.available ? 'EXAM AVAILABLE' : 'NOT YET OPEN'} glow={st.available}>
        <p className="sys-dim mb-3 text-sm">{st.available ? 'Your XP has passed the gate. Level is held and XP keeps banking until every criterion is met.' : 'The exam opens when your XP reaches the gate. These are the criteria — start collecting evidence now.'}</p>
        <ul className="space-y-2">
          {st.criteria.map((c) => <li key={c.label} className="flex gap-2 text-sm"><span className={c.met ? 'text-cyan' : 'sys-dim'}>{c.met ? '✓' : '○'}</span>{c.label}</li>)}
        </ul>
        <Btn variant="primary" big className="mt-4" disabled={!st.available} onClick={async () => {
          const r = await act(() => attemptRankExam(repo))
          if (r.passed) { sfx.levelUp(); useUI.getState().notify({ kind: 'levelup', title: 'RANK EXAM PASSED', body: `${r.rank}-RANK` }) } else setMsg('Not yet. Every criterion needs real evidence. Keep going.')
          reload()
        }}>Take the exam</Btn>
        {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}
        {st.rank !== 'D' && st.rank !== 'C' && <p className="sys-dim mt-2 text-xs">B-Rank and above are drafts, refined at monthly System Updates.</p>}
      </SystemWindow>
    </Screen>
  )
}

// ============================================================ Titles & Job
export function TitlesScreen() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const snap = useUI((s) => s.snap)!
  const [have, setHave] = useState<string[]>([])
  const reload = () => void syncTitles(repo).then(async () => setHave((await repo.db.titles.toArray()).map((t) => t.titleId)))
  useEffect(reload, [snap.totals.xp])
  const tl = checkUnlock('titles', lvl())
  const job = snap.totals.level.level >= 25 ? assignJob(snap.totals.stats) : null
  return (
    <Screen title="TITLES & JOB" onBack={back}>
      <SystemWindow title="JOB">
        {job ? <><div className="font-display text-3xl font-bold text-cyan">{job.id}</div><p className="text-sm">{job.passive}. Assigned from your top stats — never chosen.</p></> : <p className="sys-dim text-sm">LOCKED — Lv.25. Your Job is assigned from your top two stats. Candidates: {JOBS.map((j) => j.id).join(', ')}.</p>}
      </SystemWindow>
      {tl.locked && <LockedCard title="TITLES" label={tl.label} />}
      {TITLES.map((t) => {
        const owned = have.includes(t.id)
        const eq = snap.player.equippedTitle === t.id
        return (
          <SystemWindow key={t.id} title={owned ? 'TITLE' : 'LOCKED'} className={owned ? '' : 'opacity-60'}>
            <div className="font-display text-xl font-bold">{t.name}</div>
            <p className="sys-dim text-xs">{t.cond} · +{t.effect.pct}% {t.effect.kind === 'stat' ? `${t.effect.stat} XP` : t.effect.kind === 'allXp' ? 'all XP' : 'Main Quest XP'}</p>
            {owned && !tl.locked && <Btn className="mt-2 w-full" variant={eq ? 'primary' : 'default'} onClick={() => void act(() => equipTitle(repo, eq ? null : t.id)).then(reload)}>{eq ? 'Equipped' : 'Equip'}</Btn>}
          </SystemWindow>
        )
      })}
    </Screen>
  )
}

// ============================================================ Shop
export function ShopScreen() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [st, setSt] = useState<Await<ReturnType<typeof shopState>> | null>(null)
  const reload = () => void shopState(repo).then(setSt)
  useEffect(reload, [])
  const lock = checkUnlock('shop', lvl())
  if (lock.locked) return <Screen title="SHOP" onBack={back}><LockedCard title="SHOP" label={lock.label} /></Screen>
  return (
    <Screen title="SHOP" onBack={back}>
      <SystemWindow title="ESSENCE"><div className="num text-4xl text-cyan">{st?.essence ?? 0}</div><p className="sys-dim text-xs">Essence = XP ÷ 10. Rewards are earned, guilt-free. Nothing here can buy out a Daily Quest or a Penalty Quest.</p></SystemWindow>
      {st?.items.map((i) => (
        <div key={i.id} className="sys !p-3 flex items-center justify-between gap-3">
          <div><div className="font-display text-lg font-bold">{i.name}</div><div className="sys-dim text-xs">{i.minRank !== 'E' ? `Rank ${i.minRank}+ · ` : ''}<span className="num">{i.price}</span> essence</div></div>
          <Btn disabled={st.essence < i.price} onClick={async () => { const ok = await act(() => buy(repo, i.id)); if (ok) sfx.tick(); reload() }}>Buy</Btn>
        </div>
      ))}
    </Screen>
  )
}

// ============================================================ Quest-window add-ons
export function EmergencyAndGate() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const [em, setEm] = useState<TimedState | null>(null)
  const [gate, setGate] = useState<Await<ReturnType<typeof gateToday>>>(null)
  useEffect(() => { void emergencyToday(repo).then(setEm); void gateToday(repo).then(setGate) }, [snap.today, snap.totals.xp])
  const hour = Math.floor(snap.minuteOfDay / 60)
  const daytime = hour >= 8 && hour < 22 // never between 22:00 and wake time
  return (
    <>
      {em && !em.done && daytime && (
        <div data-theme="penalty">
          <SystemWindow title="EMERGENCY QUEST" right={<span className="num text-xs text-gold">+{em.xp} XP</span>} glow>
            <h3 className="font-display text-xl font-bold">{em.title}</h3>
            <p className="sys-dim text-sm">{em.desc}</p>
            <p className="sys-dim mt-1 text-xs">Time-boxed: {em.minutes} min. Optional, big reward. Never at night.</p>
            <Btn variant="primary" className="mt-3 w-full" onClick={() => void act(() => completeEmergency(repo)).then(() => sfx.levelUp())}>Done</Btn>
          </SystemWindow>
        </div>
      )}
      {gate && !gate.done && (
        <SystemWindow title="GATE · SATURDAY RAID" right={<span className="num text-xs text-gold">+250 XP</span>}>
          <h3 className="font-display text-xl font-bold">{gate.title}</h3>
          <p className="sys-dim text-sm">{gate.desc}</p>
          <p className="sys-dim mt-1 text-xs">Ship at the bell. Rank-matched.</p>
          <Btn variant="primary" className="mt-3 w-full" onClick={() => void act(() => completeGate(repo)).then(() => sfx.levelUp())}>Shipped</Btn>
        </SystemWindow>
      )}
    </>
  )
}

/** Teach-back recording (MediaRecorder). Stored on this device and auto-deleted after 30 days. */
export function Recorder() {
  const [rec, setRec] = useState<MediaRecorder | null>(null)
  const [start, setStart] = useState(0)
  const [msg, setMsg] = useState('')
  const now = useNow(500)
  const chunks = useRef<Blob[]>([])
  const supported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  if (!supported) return <p className="sys-dim text-xs">Recording isn't supported in this browser. Just say it aloud.</p>
  async function go() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        await saveRecording(repo, new Blob(chunks.current, { type: r.mimeType }), Math.round((Date.now() - start) / 1000))
        setMsg('Saved on this device (auto-deleted after 30 days).')
      }
      r.start()
      setStart(Date.now())
      setRec(r)
      setMsg('')
    } catch {
      setMsg('Microphone blocked. Allow it in the browser, or just say it aloud.')
    }
  }
  return (
    <div className="mt-2">
      {rec ? (
        <Btn variant="danger" className="w-full" onClick={() => { rec.stop(); setRec(null) }}>Stop · {fmtClock((now - start) / 1000)}</Btn>
      ) : (
        <Btn className="w-full" onClick={() => void go()}>Record my explanation</Btn>
      )}
      {msg && <p className="sys-dim mt-1 text-xs">{msg}</p>}
    </div>
  )
}

export function ScreenTimeCard() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const [v, setV] = useState(snap.log.screenMin != null ? String(snap.log.screenMin) : '')
  const target = snap.player.screenTargetMin
  if (snap.mode === 'EXAM' && target == null) return null
  const over = snap.log.screenMin != null && target != null && snap.log.screenMin > target
  return (
    <SystemWindow title="SCREEN TIME">
      <p className="sys-dim text-sm">Log today's total from Digital Wellbeing / Screen Time. {target != null ? `Target: ${target} min (drops 10 % a week while promises are kept, floor 120).` : 'Your target is set at the Full Awakening.'}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <input type="number" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} aria-label="Screen time minutes" />
        <Btn disabled={!Number(v)} onClick={() => void act(() => logScreenTime(repo, Number(v)))}>Log</Btn>
      </div>
      {over && <p className="mt-2 text-sm text-gold">SCROLL DEBUFF today: FOC stat-XP −20 %. Tomorrow is a new day.</p>}
    </SystemWindow>
  )
}

export function PainFlag() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const active = snap.player.painSwap?.until && snap.player.painSwap.until >= snap.today
  return (
    <Btn variant="ghost" className="mt-2 w-full !min-h-[40px]" onClick={() => void act(async () => { await repo.savePlayer({ painSwap: active ? undefined : { until: addDays(snap.today, 2) } }); await repo.refreshQuest(snap.today) })}>
      {active ? `Pain flag on until ${snap.player.painSwap!.until} — clear it` : 'Something hurts? Swap to mobility (3 days)'}
    </Btn>
  )
}

export function PuzzleRating() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const [v, setV] = useState(String(snap.player.lichessNow ?? ''))
  if (!snap.player.lichessStart) return null
  return (
    <SystemWindow title="PUZZLE RATING">
      <p className="sys-dim text-sm">Baseline {snap.player.lichessStart} · now {snap.player.lichessNow} · gain {(snap.player.lichessNow ?? 0) - snap.player.lichessStart}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <input type="number" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} aria-label="Current Lichess rating" />
        <Btn disabled={!Number(v)} onClick={() => void act(() => updatePuzzleRating(repo, Number(v)))}>Update</Btn>
      </div>
    </SystemWindow>
  )
}

