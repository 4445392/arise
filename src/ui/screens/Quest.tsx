import { deadlineTs } from '../../engine/day'
import { isObjectiveDone } from '../../engine/xp'
import type { ObjectiveSpec } from '../../engine/types'
import { repo } from '../../data'
import { Btn, CheckRow, Counter, LockedCard, SystemWindow, fmtHMS, useNow } from '../kit'
import { startObjective } from '../actions'
import { useUI } from '../store'
import { HiddenQuests } from './Systems'
import { EmergencyAndGate, PainFlag, PuzzleRating, Recorder } from './Forge'

const AUTO_ITEMS = new Set(['pulses', 'journal', 'next'])

function ObjectiveCard({ o, penalty }: { o: ObjectiveSpec; penalty?: boolean }) {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const open = useUI((s) => s.open)
  const day = snap.today
  const prog = snap.log.progress[o.key] ?? { items: [], value: 0 }
  const done = isObjectiveDone(o, prog)

  return (
    <div data-theme={penalty ? 'penalty' : undefined}>
      <SystemWindow
        title={penalty ? 'PENALTY QUEST' : 'QUEST INFO'}
        right={<span className="num text-xs sys-dim">{o.minutes} min{done ? ' ✓' : ''}</span>}
        className={done ? 'opacity-70' : ''}
      >
        <h3 className="font-display text-xl font-bold tracking-wide">{o.title}</h3>
        <p className="sys-dim mt-1 text-sm">{o.desc}</p>
        <div className="mt-1 text-xs sys-dim">
          {o.window} · <span className="num">{o.stats.join(' · ')}</span>
        </div>

        {o.kind === 'checklist' && (
          <div className="mt-3 space-y-2">
            {o.id === 'TEACH_BACK' && <Recorder />}
            {o.items!.map((i) => (
              <CheckRow
                key={i.id}
                label={i.label}
                checked={prog.items.includes(i.id)}
                onToggle={() => {
                  if (o.id === 'SHUTDOWN' && AUTO_ITEMS.has(i.id)) return open({ name: 'shutdown' })
                  if (o.id === 'RITUAL' && !prog.items.includes(i.id)) return open({ name: 'fear', examId: Number(o.ref), compose: true })
                  void act(() => repo.toggleItem(day, o.key, i.id))
                }}
              />
            ))}
            {o.id === 'BODY' && <PainFlag />}
            {o.id === 'SHUTDOWN' && (
              <Btn variant="primary" className="w-full" onClick={() => startObjective(o)}>
                Open Shutdown
              </Btn>
            )}
          </div>
        )}

        {o.kind === 'timer' && (
          <div className="mt-3 space-y-3">
            <Counter label={o.dungeon ? 'Logged' : 'Done'} value={prog.value} target={o.target ?? o.minutes} unit="min" />
            <div className="bar" aria-hidden>
              <i style={{ width: `${Math.min(100, (prog.value / (o.target ?? o.minutes)) * 100)}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="primary" onClick={() => startObjective(o)}>
                {o.dungeon ? 'Enter Dungeon' : 'Start timer'}
              </Btn>
              {!o.dungeon && (
                <Btn variant="ghost" onClick={() => void act(() => repo.addValue(day, o.key, 10))}>
                  +10 min
                </Btn>
              )}
              {!o.dungeon && prog.value > 0 && (
                <Btn variant="ghost" className="col-span-2" onClick={() => void act(() => repo.addValue(day, o.key, -10))}>
                  −10 min (fix a mistake)
                </Btn>
              )}
            </div>
          </div>
        )}
      </SystemWindow>
    </div>
  )
}

export default function Quest() {
  const snap = useUI((s) => s.snap)!
  const { log, settings } = snap
  const now = useNow(1000)
  const q = log.quest
  const deadline = deadlineTs(snap.today, settings.lightsOut)
  const left = (deadline - now) / 1000

  return (
    <div className="flex flex-col gap-4">
      <SystemWindow title="DAILY QUEST" right={<span className="num text-xs tracking-widest text-cyan">{log.mode}</span>}>
        <div className="flex items-end justify-between">
          <div>
            <div className="num text-4xl text-cyan">
              {log.kept}
              <span className="sys-dim text-xl">/{log.total}</span>
            </div>
            <div className="sys-dim text-xs tracking-widest">PROMISES KEPT TODAY</div>
          </div>
          <div className="text-right">
            <div className="num text-2xl">{left > 0 ? fmtHMS(left) : '00:00'}</div>
            <div className="sys-dim text-xs tracking-widest">{left > 0 ? `to lights-out ${settings.lightsOut}` : 'DEADLINE PASSED'}</div>
          </div>
        </div>
        <div className="bar mt-3" aria-hidden>
          <i style={{ width: `${log.pct}%` }} />
        </div>
        <p className="sys-dim mt-2 text-xs">
          COMPLETE = all objectives (+25 % XP) · PARTIAL = 70 %+ (no penalty) · windows are recommended, never fixed. Late logging still counts but loses the on-time bonus.
        </p>
        <div className="num mt-2 text-xs sys-dim">
          Load today: {q.totalMinutes} min of 240 max{q.loadFactor < 1 ? ` · reduced to ${Math.round(q.loadFactor * 100)} %` : ''}
        </div>
      </SystemWindow>

      {q.notices.map((n) => (
        <div key={n} data-theme="recovery" className="sys p-3 text-sm">
          {n}
        </div>
      ))}

      {q.penalty && <ObjectiveCard o={q.penalty} penalty />}
      {q.objectives.map((o) => (
        <div key={o.key}>
          <ObjectiveCard o={o} />
          {o.id === 'STRATEGY' && <div className="mt-4"><PuzzleRating /></div>}
        </div>
      ))}
      <HiddenQuests />
      <EmergencyAndGate />
      {q.locked.map((l) => (
        <LockedCard key={l.id} title={l.title} label={l.reason} />
      ))}
    </div>
  )
}
