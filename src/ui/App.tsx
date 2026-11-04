import { useEffect } from 'react'
import { repo } from '../data'
import { isObjectiveDone } from '../engine/xp'
import Notice from './Notice'
import { useUI, type Sub, type Tab } from './store'
import Onboarding from './screens/Onboarding'
import Status from './screens/Status'
import Quest from './screens/Quest'
import Timer from './screens/Timer'
import { CheckIn, Drift, Pulse } from './screens/Quick'
import { Bosses, FearLog, Reentry, Shutdown } from './screens/Flow'
import { Journal, Laws, Mirror, More, Settings, Skills } from './screens/Menus'
import { Btn } from './kit'

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: 'status', label: 'Status', glyph: '◈' },
  { id: 'quest', label: 'Quest', glyph: '✦' },
  { id: 'mirror', label: 'Mirror', glyph: '◐' },
  { id: 'skills', label: 'Skills', glyph: '⬡' },
  { id: 'more', label: 'More', glyph: '≡' },
]

function renderSub(s: Sub) {
  switch (s.name) {
    case 'timer':
      return <Timer objectiveKey={s.key} />
    case 'checkin':
      return <CheckIn />
    case 'pulse':
      return <Pulse />
    case 'shutdown':
      return <Shutdown />
    case 'drift':
      return <Drift />
    case 'reentry':
      return <Reentry driftId={s.driftId} />
    case 'fear':
      return <FearLog examId={s.examId} compose={s.compose} />
    case 'bosses':
      return <Bosses />
    case 'laws':
      return <Laws />
    case 'settings':
      return <Settings />
    case 'journal':
      return <Journal />
  }
}

export default function App() {
  const ready = useUI((s) => s.ready)
  const snap = useUI((s) => s.snap)
  const error = useUI((s) => s.error)
  const load = useUI((s) => s.load)
  const refresh = useUI((s) => s.refresh)
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const sub = useUI((s) => s.subs.at(-1))

  useEffect(() => {
    void load()
  }, [load])

  // keep the day fresh: new game day (04:00) or coming back to the app
  useEffect(() => {
    const check = () => {
      const s = useUI.getState().snap
      if (!s) return
      if (repo.today() !== s.today) void load()
      else void refresh()
    }
    const id = setInterval(check, 60_000)
    const vis = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [load, refresh])

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <h1 className="font-display text-4xl tracking-[0.5em] text-cyan">ARISE</h1>
      </main>
    )
  }
  if (error || !snap) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="sys max-w-sm p-6">
          <h1 className="sys-title">[SYSTEM ERROR]</h1>
          <p className="my-3 text-sm">{error ?? 'Could not open local storage.'}</p>
          <p className="sys-dim mb-4 text-xs">Private browsing can block local storage. Open ARISE in a normal window.</p>
          <Btn variant="primary" onClick={() => void load()}>
            Retry
          </Btn>
        </div>
      </main>
    )
  }
  if (!snap.settings.onboarded) return (
    <>
      <Onboarding />
      <Notice />
    </>
  )

  const pen = snap.log.quest.penalty
  const penaltyOpen = !!pen && !isObjectiveDone(pen, snap.log.progress[pen.key])
  const theme = penaltyOpen ? 'penalty' : snap.log.flags.recovery || snap.log.flags.hpRecovery ? 'recovery' : undefined

  return (
    <div data-theme={theme} className="min-h-dvh">
      {sub ? (
        renderSub(sub)
      ) : (
        <>
          <main className="mx-auto w-full max-w-md px-4 pb-28 safe-top">
            {tab === 'status' && <Status />}
            {tab === 'quest' && <Quest />}
            {tab === 'mirror' && <Mirror />}
            {tab === 'skills' && <Skills />}
            {tab === 'more' && <More />}
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--acc)] bg-[rgba(6,11,26,0.96)] safe-bottom" aria-label="Main">
            <ul className="mx-auto grid max-w-md grid-cols-5">
              {TABS.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={tab === t.id ? 'page' : undefined}
                    className={`flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 font-display text-xs font-semibold tracking-widest ${tab === t.id ? 'text-cyan' : 'text-[#8fa6cf]'}`}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {t.glyph}
                    </span>
                    {t.label.toUpperCase()}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
      <Notice />
    </div>
  )
}
