import { useEffect, useState } from 'react'
import { diffDays, weekday } from '../../engine/day'
import { checkUnlock } from '../../engine/unlocks'
import { backupDue } from '../../engine/report'
import { shadowRank, arise, listShadows, hiddenToday, completeHidden, guildReport, markBackup, type HiddenState } from '../../data/extras'
import { repo } from '../../data'
import type { Shadow } from '../../data/models'
import { sfx } from '../../audio'
import { Btn, LockedCard, Screen, SystemWindow } from '../kit'
import { downloadBackup } from '../download'
import { useUI } from '../store'

// ============================================================ Shadow Army
export function ShadowArmy() {
  const snap = useUI((s) => s.snap)!
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [shadows, setShadows] = useState<Shadow[]>([])
  const [ready, setReady] = useState<{ id: number; afraid: string; severity: number }[]>([])
  const [burst, setBurst] = useState(0)
  const lock = checkUnlock('shadowArmy', { level: snap.totals.level.level, mode: snap.mode, rank: snap.totals.level.rank })

  const reload = async () => {
    const [sh, fears] = await Promise.all([listShadows(repo), repo.listFears()])
    setShadows(sh)
    const have = new Set(sh.map((s) => s.fearId))
    setReady(fears.filter((f) => f.outcome && !have.has(f.id!)).map((f) => ({ id: f.id!, afraid: f.afraid, severity: f.severity })))
  }
  useEffect(() => void reload(), [])

  if (lock.locked) {
    return (
      <Screen title="SHADOW ARMY" onBack={back}>
        <LockedCard title="SHADOW ARMY" label={lock.label} hint="Every fear you beat becomes a Shadow." />
      </Screen>
    )
  }
  return (
    <Screen title="SHADOW ARMY" onBack={back}>
      <SystemWindow title="THE ARMY" right={<span className="num text-cyan">{shadows.length}</span>}>
        <p className="sys-dim text-sm">Visual proof of every fear you have beaten. Fear is data: predicted, logged, compared with reality.</p>
      </SystemWindow>
      {ready.length > 0 && (
        <SystemWindow title="READY TO EXTRACT" glow>
          {ready.map((r) => (
            <div key={r.id} className="mb-3 border-b border-[rgba(143,166,207,0.2)] pb-3">
              <p className="text-sm">I was afraid that {r.afraid}</p>
              <Btn
                variant="primary"
                className="mt-2 w-full"
                onClick={async () => {
                  sfx.arise()
                  setBurst((b) => b + 1)
                  await act(() => arise(repo, r.id))
                  await reload()
                }}
              >
                ARISE
              </Btn>
            </div>
          ))}
        </SystemWindow>
      )}
      <div className="relative grid grid-cols-2 gap-3">
        {burst > 0 && (
          <div key={burst} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {Array.from({ length: 18 }, (_, i) => (
              <i key={i} className="particle" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.08}s` }} />
            ))}
          </div>
        )}
        {shadows.map((s) => (
          <div key={s.id} className="sys !p-3">
            <div className="num text-xs tracking-widest text-cyan">RANK {shadowRank(s.severity)}</div>
            <div className="font-display mt-1 text-base font-bold leading-tight">{s.name}</div>
            <div className="sys-dim mt-1 text-[11px]">severity {s.severity}/10</div>
          </div>
        ))}
      </div>
      {shadows.length === 0 && ready.length === 0 && <p className="sys-dim text-sm">No Shadows yet. Resolve a fear in the Fear Log (compare it with what happened) and it can ARISE here.</p>}
    </Screen>
  )
}

// ============================================================ Hidden quests card (used in the Quest window)
export function HiddenQuests() {
  const snap = useUI((s) => s.snap)!
  const act = useUI((s) => s.act)
  const [list, setList] = useState<HiddenState[]>([])
  const lv = snap.totals.level.level
  useEffect(() => {
    void hiddenToday(repo, lv).then(setList)
  }, [snap.today, snap.totals.xp, lv])
  const open = list.filter((h) => !h.done)
  if (!open.length) return null
  return (
    <>
      {open.map((h) => (
        <SystemWindow key={h.id} title="HIDDEN QUEST" right={<span className="num text-xs text-gold">+{h.xp} XP</span>}>
          <h3 className="font-display text-xl font-bold">{h.title}</h3>
          <p className="sys-dim mt-1 text-sm">{h.desc}</p>
          <p className="sys-dim mt-1 text-xs">Optional. Bonus XP. Open until Sunday. {h.stats.join(' · ')}</p>
          <Btn variant="primary" className="mt-3 w-full" onClick={() => void act(() => completeHidden(repo, h.id)).then(() => sfx.tick())}>
            Done
          </Btn>
        </SystemWindow>
      ))}
    </>
  )
}

// ============================================================ Quest Log
export function QuestLog() {
  const snap = useUI((s) => s.snap)!
  const back = useUI((s) => s.back)
  const open = useUI((s) => s.open)
  const pen = snap.log.quest.penalty
  return (
    <Screen title="QUEST LOG" onBack={back}>
      <SystemWindow title="DAILY">
        <p className="text-sm">
          {snap.log.kept}/{snap.log.total} kept today · {snap.log.quest.totalMinutes} min.
        </p>
      </SystemWindow>
      <SystemWindow title="PENALTY">
        <p className="text-sm">{pen ? pen.title : snap.player.penalty.penaltyPending ? 'Issued tomorrow.' : snap.player.penalty.recoveryDaysLeft > 0 ? `Recovery Mode: ${snap.player.penalty.recoveryDaysLeft} day(s) left. No penalties.` : 'None. Keep it that way — never miss twice.'}</p>
      </SystemWindow>
      <SystemWindow title="HIDDEN">
        <HiddenQuests />
        <p className="sys-dim text-sm">Appears from Lv3, one or two a week. Bonus XP only.</p>
      </SystemWindow>
      <SystemWindow title="BOSS RAIDS">
        {snap.exams.length ? snap.exams.map((e) => <p key={e.id} className="text-sm">{e.subject} — {e.dateKey}{e.showedUp ? ' ✓' : ''}</p>) : <p className="sys-dim text-sm">No exams entered.</p>}
        <Btn variant="ghost" className="mt-2 w-full" onClick={() => open({ name: 'bosses' })}>
          Open Boss Raids
        </Btn>
      </SystemWindow>
      {['MAIN QUEST', 'SKILL GATE', 'EMERGENCY', 'GATES'].map((t) => (
        <LockedCard key={t} title={t} label={snap.mode === 'EXAM' && t !== 'EMERGENCY' && t !== 'GATES' ? 'LOCKED — after the final boss' : t === 'EMERGENCY' ? 'LOCKED — Lv.8' : t === 'GATES' ? 'LOCKED — D-Rank' : 'OPEN'} />
      ))}
    </Screen>
  )
}

// ============================================================ Guild Report
export function GuildReport() {
  const snap = useUI((s) => s.snap)!
  const back = useUI((s) => s.back)
  const act = useUI((s) => s.act)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => {
    void guildReport(repo).then((r) => setText(r.text))
  }, [snap.today, snap.totals.xp])
  return (
    <Screen title="GUILD REPORT" onBack={back}>
      <SystemWindow title="THE WEEK">
        <pre className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed">{text || 'Building…'}</pre>
      </SystemWindow>
      <Btn
        variant="primary"
        big
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setMsg('Copied. Paste it into a Claude chat for coaching.')
          } catch {
            setMsg('Copy blocked by the browser — select the text above and copy it manually.')
          }
        }}
      >
        Copy for Claude
      </Btn>
      <Btn variant="ghost" onClick={() => useUI.getState().open({ name: 'audit' })}>Thought Audit (weekly)</Btn>
      <Btn onClick={() => void act(async () => { await downloadBackup(snap.today); await markBackup(repo) }).then(() => setMsg('Backup downloaded.'))}>Download backup (JSON)</Btn>
      {msg && <p className="text-sm text-cyan" role="status">{msg}</p>}
      <p className="sys-dim text-xs">The weakest stat becomes next week's Focus Stat: its objectives earn ×1.5 XP.</p>
    </Screen>
  )
}

/** Sunday backup nudge for the Status window. */
export function BackupBanner() {
  const snap = useUI((s) => s.snap)!
  const open = useUI((s) => s.open)
  const due = backupDue(snap.settings.lastBackupDay, snap.today, weekday(snap.today) === 0, diffDays)
  if (!due) return null
  return (
    <SystemWindow title="BACKUP">
      <p className="text-sm">Your data lives only on this phone. Download this week's backup.</p>
      <Btn variant="primary" className="mt-3 w-full" onClick={() => open({ name: 'guild' })}>
        Guild Report + backup
      </Btn>
    </SystemWindow>
  )
}
