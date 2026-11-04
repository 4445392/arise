import { useEffect, useState } from 'react'
import { Suspense, lazy } from 'react'

const TrendChart = lazy(() => import('../charts').then((m) => ({ default: m.TrendChart })))
import { FACTOR_NAMES, IPIP_ITEMS, SCALE_LABELS, type Factor } from '../../content/ipip50'
import { THINKING_TRAPS, VALUES } from '../../content/values'
import { plainMeaning, scoreIpip } from '../../engine/ipip'
import { band, computeInsights, type Insight } from '../../engine/insights'
import { buildManual, manualText, MOTIVES } from '../../engine/manual'
import { addDays } from '../../engine/day'
import { checkUnlock } from '../../engine/unlocks'
import { repo } from '../../data'
import { addDecision, addFeedback, addThoughtAudit, latestAssessment, listAudits, listDecisions, reviewDecision, saveAssessment } from '../../data/extras'
import type { Decision, ThoughtAudit } from '../../data/models'
import { Btn, Chip, Field, LockedCard, Rating, Screen, Sheet, SystemWindow } from '../kit'
import { useUI } from '../store'

// ============================================================ Post-objective feedback (difficulty, enjoyment, motive)
export function FeedbackSheet() {
  const fb = useUI((s) => s.feedback)
  const clear = useUI((s) => s.clearFeedback)
  const [d, setD] = useState<number | null>(null)
  const [e, setE] = useState<number | null>(null)
  const [m, setM] = useState<string | null>(null)
  useEffect(() => {
    setD(null)
    setE(null)
    setM(null)
  }, [fb?.key])
  if (!fb) return null
  const ok = d !== null && e !== null && (!fb.ask || m !== null)
  return (
    <Sheet title="HOW WAS IT?" onClose={clear}>
      <p className="sys-dim mb-3 text-sm">{fb.title} — two taps. This feeds the Mirror.</p>
      <div className="space-y-4">
        <Rating label="Difficulty" value={d} onChange={setD} labels={['easy', 'hard']} />
        <Rating label="Enjoyment" value={e} onChange={setE} labels={['disliked', 'loved']} />
        {fb.ask && (
          <div>
            <label className="field">What got you to do this?</label>
            <div className="flex flex-wrap gap-2">
              {MOTIVES.map((x) => (
                <Chip key={x} on={m === x} onClick={() => setM(x)}>
                  {x}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn variant="ghost" onClick={clear}>
          Skip
        </Btn>
        <Btn
          variant="primary"
          disabled={!ok}
          onClick={async () => {
            await addFeedback(repo, fb.key, d!, e!, m ?? undefined)
            clear()
            void useUI.getState().refresh()
          }}
        >
          Save
        </Btn>
      </div>
    </Sheet>
  )
}

// ============================================================ Player Manual
export function Manual() {
  const snap = useUI((s) => s.snap)!
  const back = useUI((s) => s.back)
  const [ins, setIns] = useState<Insight[]>([])
  const [detail, setDetail] = useState<Insight | null>(null)
  const [msg, setMsg] = useState('')
  const lock = checkUnlock('playerManual', { level: snap.totals.level.level, mode: snap.mode, rank: snap.totals.level.rank })
  useEffect(() => {
    void repo.insightInput().then((i) => setIns(computeInsights(i)))
  }, [snap.today, snap.totals.xp])
  const sections = buildManual(ins)
  const eh = ins.find((i) => i.id === 'easyHard')
  const map = (eh?.detail as { map?: Record<string, string[]> } | undefined)?.map

  return (
    <Screen title="PLAYER MANUAL" onBack={back}>
      <SystemWindow title="DECODED" right={<span className="num text-2xl text-cyan">{snap.decoded}%</span>}>
        <p className="sys-dim text-sm">Each chapter unlocks from real data. Sample size always shown. Patterns, not proof.</p>
        {lock.locked && <p className="mt-2 text-xs text-gold">{lock.label}: the full Manual opens at Lv.5. Chapters below still show your progress.</p>}
      </SystemWindow>

      <SystemWindow title={`HOW ${snap.settings.name.toUpperCase()} WORKS`}>
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.title}>
              <h3 className="font-display text-lg font-bold tracking-wide">{s.title}</h3>
              <p className={`text-sm ${s.unlocked ? '' : 'sys-dim'}`}>{s.text}</p>
            </div>
          ))}
        </div>
        <Btn
          className="mt-4 w-full"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(manualText(snap.settings.name, sections))
              setMsg('Manual copied as text.')
            } catch {
              setMsg('Copy blocked by the browser.')
            }
          }}
        >
          Export as text (copy)
        </Btn>
        {msg && <p className="mt-2 text-sm text-cyan">{msg}</p>}
      </SystemWindow>

      {map && (
        <SystemWindow title="EASY / HARD MAP">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['Natural Talents', 'Growth Zone', 'Chores', 'Dragons'] as const).map((q) => (
              <div key={q} className="sys !p-3">
                <div className="sys-title !text-xs">{q}</div>
                <div className="mt-1">{map[q]?.length ? map[q].join(', ') : '—'}</div>
                <div className="sys-dim mt-1 text-[10px]">{q === 'Natural Talents' ? 'easy + enjoy' : q === 'Growth Zone' ? 'hard + enjoy' : q === 'Chores' ? 'easy + dislike' : 'hard + dislike'}</div>
              </div>
            ))}
          </div>
        </SystemWindow>
      )}

      <SystemWindow title="CHAPTERS">
        <ul className="space-y-2">
          {ins.map((i) => (
            <li key={i.id}>
              <button type="button" className="tap-row" onClick={() => setDetail(i)}>
                <span className="box">{i.unlocked ? '✓' : ''}</span>
                <span className="flex-1">
                  <b>{i.title}</b>
                  <span className="sys-dim block text-xs">{i.unlocked ? `${i.headline} (n=${i.sample})` : `Locked — ${i.need} · have ${i.sample}`}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </SystemWindow>
      {detail && (
        <Sheet title={detail.title.toUpperCase()} onClose={() => setDetail(null)}>
          <p className="text-sm">{detail.unlocked ? detail.headline : `Locked. Needs ${detail.need}. You have ${detail.sample}.`}</p>
          <p className="sys-dim mt-2 text-xs">Sample size: {detail.sample}. Correlations are patterns, not proof.</p>
        </Sheet>
      )}
    </Screen>
  )
}

// ============================================================ Thought Audit (weekly)
export function ThoughtAuditScreen() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [traps, setTraps] = useState<Record<string, number>>({})
  const [past, setPast] = useState<ThoughtAudit[]>([])
  const reload = () => void listAudits(repo).then(setPast)
  useEffect(reload, [])
  const trend = past.map((a) => ({ week: a.weekKey.slice(5), total: Object.values(a.traps).reduce((x, y) => x + y, 0) }))
  return (
    <Screen title="THOUGHT AUDIT" onBack={back}>
      <SystemWindow title="WHICH TRAPS SHOWED UP THIS WEEK?">
        <div className="space-y-4">
          {THINKING_TRAPS.map((t) => (
            <div key={t.id}>
              <div className="font-display text-lg font-bold">{t.name}</div>
              <div className="sys-dim text-xs">
                {t.example} Antidote: {t.antidote}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {['never', 'once', 'a few', 'often'].map((l, n) => (
                  <Chip key={l} on={(traps[t.id] ?? 0) === n} onClick={() => setTraps({ ...traps, [t.id]: n })}>
                    {l}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Btn
          variant="primary"
          big
          className="mt-5"
          onClick={async () => {
            await act(() => addThoughtAudit(repo, traps))
            reload()
          }}
        >
          Save audit
        </Btn>
      </SystemWindow>
      {trend.length > 1 && (
        <SystemWindow title="TREND">
          <div className="h-32">
            <Suspense fallback={<p className="sys-dim text-xs">Loading chart…</p>}>
              <TrendChart data={trend} />
            </Suspense>
          </div>
        </SystemWindow>
      )}
      <p className="sys-dim text-xs">{past.length} audit(s) saved. At 4 audits the "Top trap" chapter unlocks in the Manual.</p>
    </Screen>
  )
}

// ============================================================ Assessments
export function Assessments() {
  const back = useUI((s) => s.back)
  const open = useUI((s) => s.open)
  const [ipip, setIpip] = useState<ReturnType<typeof scoreIpip>>(null)
  const [values, setValues] = useState<string[] | null>(null)
  const [becoming, setBecoming] = useState<string[] | null>(null)
  useEffect(() => {
    void latestAssessment(repo, 'ipip').then((a) => setIpip((a?.result as ReturnType<typeof scoreIpip>) ?? null))
    void latestAssessment(repo, 'values').then((a) => setValues((a?.result as string[]) ?? null))
    void latestAssessment(repo, 'becoming').then((a) => setBecoming((a?.result as string[]) ?? null))
  }, [])
  return (
    <Screen title="ASSESSMENTS" onBack={back}>
      <SystemWindow title="BIG FIVE · IPIP-50">
        {ipip ? (
          <ul className="space-y-2 text-sm">
            {(Object.keys(FACTOR_NAMES) as Factor[]).map((f) => (
              <li key={f}>
                <b>{FACTOR_NAMES[f]}:</b> <span className="text-cyan">{band(ipip[f])}</span>
                <span className="sys-dim block text-xs">{plainMeaning(f, band(ipip[f]))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sys-dim text-sm">50 statements, about 8 minutes. Results appear as low / average / high bands, not false precision. Retake every 6 months to see change.</p>
        )}
        <Btn variant="primary" className="mt-3 w-full" onClick={() => open({ name: 'ipip' })}>
          {ipip ? 'Retake' : 'Start'}
        </Btn>
        <p className="sys-dim mt-2 text-[11px]">Items: International Personality Item Pool (Goldberg), public domain — ipip.ori.org.</p>
      </SystemWindow>
      <SystemWindow title="VALUES">
        {values ? <p className="text-sm">Top 5: <b className="text-cyan">{values.join(' · ')}</b></p> : <p className="sys-dim text-sm">Sort ~30 values, keep your top 5.</p>}
        <Btn className="mt-3 w-full" onClick={() => open({ name: 'values' })}>
          {values ? 'Re-sort' : 'Start card sort'}
        </Btn>
      </SystemWindow>
      <SystemWindow title="WHO I'M BECOMING">
        {becoming ? <p className="text-sm">{becoming.join(' ')}</p> : <p className="sys-dim text-sm">Three sentences in your own words. Shown on the back of the Status Window.</p>}
        <Btn className="mt-3 w-full" onClick={() => open({ name: 'becoming' })}>
          {becoming ? 'Rewrite' : 'Write it'}
        </Btn>
      </SystemWindow>
    </Screen>
  )
}

export function IpipTest() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [a, setA] = useState<Record<number, number>>({})
  const [i, setI] = useState(0)
  const item = IPIP_ITEMS[i]
  const done = Object.keys(a).length
  return (
    <Screen title={`IPIP ${Math.min(i + 1, 50)}/50`} onBack={back}>
      <SystemWindow title="I…">
        <div className="bar mb-4" aria-hidden>
          <i style={{ width: `${(done / 50) * 100}%` }} />
        </div>
        <p className="font-display text-2xl font-bold">{item.text}</p>
        <div className="mt-5 grid gap-2">
          {SCALE_LABELS.map((l, n) => (
            <Btn
              key={l}
              variant={a[item.n] === n + 1 ? 'primary' : 'default'}
              onClick={() => {
                const next = { ...a, [item.n]: n + 1 }
                setA(next)
                if (i < 49) setI(i + 1)
              }}
            >
              {n + 1} · {l}
            </Btn>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
            Previous
          </Btn>
          <Btn
            variant="primary"
            disabled={done < 50}
            onClick={async () => {
              const s = scoreIpip(a)
              if (!s) return
              await act(() => saveAssessment(repo, 'ipip', s))
              back()
            }}
          >
            Finish
          </Btn>
        </div>
      </SystemWindow>
    </Screen>
  )
}

export function ValuesSort() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [keep, setKeep] = useState<string[]>([])
  const [stage, setStage] = useState<1 | 2>(1)
  const [top, setTop] = useState<string[]>([])
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  return (
    <Screen title="VALUES SORT" onBack={back}>
      {stage === 1 ? (
        <SystemWindow title="1 · WHAT MATTERS?">
          <p className="sys-dim mb-3 text-sm">Tap every value that truly matters to you. Be strict: aim for 10–15.</p>
          <div className="flex flex-wrap gap-2">
            {VALUES.map((v) => (
              <Chip key={v} on={keep.includes(v)} onClick={() => setKeep(toggle(keep, v))}>
                {v}
              </Chip>
            ))}
          </div>
          <Btn variant="primary" big className="mt-5" disabled={keep.length < 5} onClick={() => setStage(2)}>
            Next ({keep.length})
          </Btn>
        </SystemWindow>
      ) : (
        <SystemWindow title="2 · PICK YOUR TOP 5">
          <div className="flex flex-wrap gap-2">
            {keep.map((v) => (
              <Chip key={v} on={top.includes(v)} onClick={() => (top.includes(v) || top.length < 5) && setTop(toggle(top, v))}>
                {v}
              </Chip>
            ))}
          </div>
          <Btn
            variant="primary"
            big
            className="mt-5"
            disabled={top.length !== 5}
            onClick={async () => {
              await act(() => saveAssessment(repo, 'values', top))
              back()
            }}
          >
            Save top 5 ({top.length}/5)
          </Btn>
        </SystemWindow>
      )}
    </Screen>
  )
}

export function Becoming() {
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [s, setS] = useState(['', '', ''])
  return (
    <Screen title="WHO I'M BECOMING" onBack={back}>
      <SystemWindow title="THREE SENTENCES">
        <div className="space-y-3">
          {['I am becoming someone who…', 'People will describe me as…', 'My days are built around…'].map((p, k) => (
            <Field key={p} label={p}>
              <textarea rows={2} value={s[k]} onChange={(e) => setS(s.map((x, j) => (j === k ? e.target.value : x)))} />
            </Field>
          ))}
        </div>
        <Btn
          variant="primary"
          big
          className="mt-5"
          disabled={s.some((x) => !x.trim())}
          onClick={async () => {
            await act(() => saveAssessment(repo, 'becoming', s.map((x) => x.trim())))
            back()
          }}
        >
          Save
        </Btn>
      </SystemWindow>
    </Screen>
  )
}

// ============================================================ Decision Journal (after D-Rank)
export function Decisions() {
  const snap = useUI((s) => s.snap)!
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [list, setList] = useState<Decision[]>([])
  const [f, setF] = useState({ decision: '', expected: '', why: '', confidence: 60, months: 1 })
  const [rev, setRev] = useState<Record<number, { o: string; l: string }>>({})
  const lock = checkUnlock('decisionJournal', { level: snap.totals.level.level, mode: snap.mode, rank: snap.totals.level.rank })
  const reload = () => void listDecisions(repo).then(setList)
  useEffect(reload, [])
  if (lock.locked) {
    return (
      <Screen title="DECISION JOURNAL" onBack={back}>
        <LockedCard title="DECISION JOURNAL" label={lock.label} hint="For decisions that matter: write the expectation now, review the outcome later." />
      </Screen>
    )
  }
  return (
    <Screen title="DECISION JOURNAL" onBack={back}>
      <SystemWindow title="NEW DECISION">
        <div className="space-y-3">
          <Field label="Decision">
            <input type="text" value={f.decision} onChange={(e) => setF({ ...f, decision: e.target.value })} />
          </Field>
          <Field label="Expected outcome">
            <input type="text" value={f.expected} onChange={(e) => setF({ ...f, expected: e.target.value })} />
          </Field>
          <Field label="Why">
            <input type="text" value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} />
          </Field>
          <Field label={`Confidence: ${f.confidence}%`}>
            <input type="range" min={0} max={100} step={5} value={f.confidence} onChange={(e) => setF({ ...f, confidence: Number(e.target.value) })} />
          </Field>
          <Field label={`Review in ${f.months} month(s)`}>
            <input type="range" min={1} max={3} value={f.months} onChange={(e) => setF({ ...f, months: Number(e.target.value) })} />
          </Field>
        </div>
        <Btn
          variant="primary"
          big
          className="mt-4"
          disabled={!f.decision.trim() || !f.expected.trim()}
          onClick={async () => {
            await act(() => addDecision(repo, { decision: f.decision, expected: f.expected, why: f.why, confidence: f.confidence, reviewDay: addDays(snap.today, f.months * 30) }))
            setF({ decision: '', expected: '', why: '', confidence: 60, months: 1 })
            reload()
          }}
        >
          Log decision
        </Btn>
      </SystemWindow>
      {list.map((d) => (
        <SystemWindow key={d.id} title={d.outcome ? 'REVIEWED' : d.reviewDay <= snap.today ? 'REVIEW DUE' : `REVIEW ${d.reviewDay}`}>
          <p className="font-bold">{d.decision}</p>
          <p className="sys-dim text-sm">Expected: {d.expected} · {d.confidence}% sure</p>
          {d.outcome ? (
            <p className="mt-1 text-sm text-cyan">Outcome: {d.outcome} — Lesson: {d.lesson}</p>
          ) : (
            <div className="mt-2 space-y-2">
              <input type="text" placeholder="What happened?" value={rev[d.id!]?.o ?? ''} onChange={(e) => setRev({ ...rev, [d.id!]: { o: e.target.value, l: rev[d.id!]?.l ?? '' } })} />
              <input type="text" placeholder="Lesson" value={rev[d.id!]?.l ?? ''} onChange={(e) => setRev({ ...rev, [d.id!]: { o: rev[d.id!]?.o ?? '', l: e.target.value } })} />
              <Btn disabled={!rev[d.id!]?.o} onClick={async () => { await act(() => reviewDecision(repo, d.id!, rev[d.id!].o, rev[d.id!].l)); reload() }}>
                Record review
              </Btn>
            </div>
          )}
        </SystemWindow>
      ))}
    </Screen>
  )
}
