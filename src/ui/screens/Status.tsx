import { useEffect, useState } from 'react'
import { isRusty } from '../../engine/stats'
import { diffDays } from '../../engine/day'
import { STAT_KEYS } from '../../engine/types'
import { TRUST_COPY } from '../../engine/trust'
import { Bar, Btn, SystemWindow } from '../kit'
import { startObjective, daysUntil, STAT_FULL } from '../actions'
import { useUI } from '../store'
import { BackupBanner } from './Systems'

const MODE_LABEL = { EXAM: 'EXAM MODE', BREAK: 'TRAINING ARC', SEMESTER: 'SEMESTER' } as const

export default function Status() {
  const snap = useUI((s) => s.snap)!
  const open = useUI((s) => s.open)
  const setTab = useUI((s) => s.setTab)
  const { totals, log, settings, next } = snap
  const lv = totals.level
  const hp = log.checkIn?.hp
  const mp = log.checkIn?.mp
  const pulseDue = snap.minuteOfDay >= 12 * 60 + 30 && !snap.pulseSlots.includes(2) && snap.pulseSlots.includes(1)
  const nextExam = snap.exams.filter((e) => e.dateKey >= snap.today && !e.showedUp).sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0]
  const [flipped, setFlipped] = useState(false)
  useEffect(() => setFlipped(false), [snap.today])

  const trust30 = totals.trust30
  const trust7 = totals.trust7
  const essence = Math.floor(totals.xp / 10)

  return (
    <div className="flex flex-col gap-4">
      <SystemWindow
        title="STATUS"
        right={<span className="num text-xs tracking-widest text-cyan">{MODE_LABEL[snap.mode]}</span>}
      >
        {!flipped ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-display text-2xl font-bold">{settings.name}</div>
                <div className="sys-dim text-xs tracking-widest">TITLE —  ·  JOB —</div>
              </div>
              <div className="text-right">
                <div className="num text-5xl leading-none text-cyan">
                  <span className="text-base sys-dim">Lv.</span>
                  {lv.level}
                </div>
                <div className="num text-sm tracking-[0.3em]">RANK {lv.rank}</div>
              </div>
            </div>
            <div className="mt-3">
              <Bar value={lv.xpIntoLevel} max={lv.xpForNext} label="XP" right={lv.capped ? 'RANK EXAM AVAILABLE' : `${lv.xpIntoLevel}/${lv.xpForNext}`} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="sys !p-3 text-center">
                <div className="sys-dim text-[11px] tracking-[0.2em]">TRUST · 30 DAY</div>
                <div className="num text-4xl text-cyan">{trust30 === null ? '—' : `${Math.round(trust30)}%`}</div>
                <div className="sys-dim text-xs">7-day {trust7 === null ? '—' : `${Math.round(trust7)}%`}</div>
              </div>
              <div className="sys !p-3 text-center">
                <div className="sys-dim text-[11px] tracking-[0.2em]">DECODED</div>
                <div className="num text-4xl text-cyan">{snap.decoded}%</div>
                <div className="sys-dim text-xs">Mirror chapters</div>
              </div>
            </div>
            <p className="sys-dim mt-3 text-center text-xs italic">{TRUST_COPY}</p>
          </>
        ) : (
          <div>
            <div className="sys-dim text-xs tracking-widest">WHO I'M BECOMING</div>
            <p className="mt-2 text-sm">{snap.player.becoming?.join(' ') || 'Written during the Full Awakening, after the exams. Three sentences, in your own words.'}</p>
          </div>
        )}
        <button type="button" className="mt-3 w-full text-center text-xs tracking-widest sys-dim underline" onClick={() => setFlipped((f) => !f)}>
          {flipped ? 'FRONT' : 'FLIP WINDOW'}
        </button>
      </SystemWindow>

      {hp !== undefined && mp !== undefined ? (
        <SystemWindow title="VITALS">
          <div className="space-y-3">
            <Bar kind="hp" value={hp} label="HP" right={`${hp}/100`} />
            <Bar kind="mp" value={mp} label="MP" right={`${mp}/100`} />
          </div>
        </SystemWindow>
      ) : (
        <Btn big variant="primary" onClick={() => open({ name: 'checkin' })}>
          Morning check-in · 15 s
        </Btn>
      )}

      {log.flags.hpRecovery && (
        <div data-theme="recovery" className="sys p-3 text-sm">
          <b className="sys-title">[RECOVERY PROTOCOL]</b>
          <p className="mt-1">HP is low. Today's Body is mobility and a walk. It still counts as kept.</p>
        </div>
      )}
      {log.flags.recovery && (
        <div data-theme="recovery" className="sys p-3 text-sm">
          <b className="sys-title">[RECOVERY MODE]</b>
          <p className="mt-1">Load is 50 % for {snap.player.penalty.recoveryDaysLeft} more day(s). No penalties. Return.</p>
        </div>
      )}

      <div data-theme={log.quest.penalty && !(log.progress.PENALTY && log.progress.PENALTY.value >= (log.quest.penalty.target ?? 1)) ? 'penalty' : undefined}>
        <SystemWindow title={next?.id === 'PENALTY' ? 'PENALTY QUEST' : 'NEXT OBJECTIVE'} glow>
          {next ? (
            <>
              <div className="font-display text-2xl font-bold">{next.title}</div>
              <p className="sys-dim mt-1 text-sm">{next.desc}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 text-xs sys-dim">
                <span>{next.window}</span>
                <span className="num">{next.minutes} min</span>
                <span className="num">{next.stats.join(' · ')}</span>
              </div>
              <Btn variant="primary" big className="mt-4" onClick={() => startObjective(next)}>
                Start
              </Btn>
            </>
          ) : (
            <p className="text-lg">Every promise kept today. Rest. The engine needs it.</p>
          )}
        </SystemWindow>
      </div>

      <Btn variant="danger" big onClick={() => open({ name: 'drift' })}>
        I drifted
      </Btn>

      {pulseDue && (
        <Btn onClick={() => open({ name: 'pulse' })} className="w-full">
          Pulse #2 is due · 10 s
        </Btn>
      )}

      <BackupBanner />

      {snap.checkBacksDue.length > 0 && (
        <SystemWindow title="CHECK-BACK DUE">
          <p className="text-sm">{snap.checkBacksDue.length} fear(s) are ready to compare with reality.</p>
          <Btn className="mt-3 w-full" onClick={() => open({ name: 'fear' })}>
            Open Fear Log
          </Btn>
        </SystemWindow>
      )}

      {nextExam && (
        <SystemWindow title="BOSS RAID" right={<span className="num text-sm text-cyan">{daysUntil(snap.today, nextExam.dateKey) === 0 ? 'TODAY' : `T-${daysUntil(snap.today, nextExam.dateKey)}d`}</span>}>
          <div className="font-display text-xl font-bold">{nextExam.subject}</div>
          <p className="sys-dim text-sm">{nextExam.dateKey}</p>
          <Btn variant="ghost" className="mt-3 w-full" onClick={() => open({ name: 'bosses' })}>
            Boss Raids
          </Btn>
        </SystemWindow>
      )}

      <SystemWindow title="STATS">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {STAT_KEYS.map((k) => {
            const rust = isRusty(totals.lastTrained[k], snap.today, diffDays)
            return (
              <div key={k} className="flex items-baseline justify-between border-b border-[rgba(143,166,207,0.18)] pb-1">
                <span className="text-sm" title={STAT_FULL[k]}>
                  <span className="font-display font-bold tracking-widest">{k}</span>
                  {rust && <span className="ml-1 text-[10px] tracking-widest text-gold">RUST</span>}
                </span>
                <span className="num text-2xl text-cyan">{totals.stats[k]}</span>
              </div>
            )
          })}
        </div>
        <p className="sys-dim mt-3 text-xs">Stats only rise from logged real actions. INT trains applied intelligence, not IQ. LCK grows with exposure: ask, publish, meet.</p>
      </SystemWindow>

      <div className="grid grid-cols-2 gap-3">
        <div className="sys !p-3">
          <div className="sys-dim text-[11px] tracking-[0.2em]">GOLD</div>
          <div className="num text-2xl text-gold">R0</div>
        </div>
        <div className="sys !p-3">
          <div className="sys-dim text-[11px] tracking-[0.2em]">ESSENCE</div>
          <div className="num text-2xl text-cyan">{essence}</div>
        </div>
        <div className="sys !p-3">
          <div className="sys-dim text-[11px] tracking-[0.2em]">STREAK</div>
          <div className="num text-2xl">{totals.streak} d</div>
        </div>
        <div className="sys !p-3">
          <div className="sys-dim text-[11px] tracking-[0.2em]">PROMISES KEPT</div>
          <div className="num text-2xl">{totals.promisesKept}</div>
        </div>
      </div>
      <button type="button" className="text-center text-xs tracking-widest sys-dim underline" onClick={() => setTab('quest')}>
        Open the full Quest window
      </button>
    </div>
  )
}
