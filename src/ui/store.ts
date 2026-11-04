import { create } from 'zustand'
import { configureAudio, LINES, sfx } from '../audio'
import { STAT_KEYS, type StatKey } from '../engine/types'
import { MODE_NOTICES } from '../engine/mode'
import { repo, requestPersist, type Snapshot } from '../data'

export type Tab = 'status' | 'quest' | 'mirror' | 'skills' | 'more'

export type Sub =
  | { name: 'timer'; key: string }
  | { name: 'checkin' }
  | { name: 'pulse' }
  | { name: 'shutdown' }
  | { name: 'drift' }
  | { name: 'reentry'; driftId: number }
  | { name: 'fear'; examId?: number; compose?: boolean }
  | { name: 'bosses' }
  | { name: 'laws' }
  | { name: 'settings' }
  | { name: 'journal' }
  | { name: 'shadows' }
  | { name: 'guild' }
  | { name: 'questlog' }

export type NoticeKind = 'system' | 'penalty' | 'recovery' | 'levelup' | 'support'

export interface NoticeItem {
  id: string
  kind: NoticeKind
  title: string
  body: string
  lines?: string[]
  cta?: string
}

interface UI {
  snap: Snapshot | null
  ready: boolean
  error: string | null
  tab: Tab
  subs: Sub[]
  notices: NoticeItem[]
  load: () => Promise<void>
  refresh: () => Promise<void>
  /** Run a repo mutation, refresh, then fire sounds / level-up notices. */
  act: <T>(fn: () => Promise<T>) => Promise<T>
  setTab: (t: Tab) => void
  open: (s: Sub) => void
  /** Swap the top sub-screen without adding history (e.g. Drift -> Re-entry). */
  replace: (s: Sub) => void
  back: () => void
  closeAll: () => void
  notify: (n: Omit<NoticeItem, 'id'>) => void
  dismissNotice: () => void
}

const ARRIVAL_KEY = 'arise.arrival'
let popBound = false

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* storage blocked: fine, the notice just repeats */
  }
}

export const useUI = create<UI>((set, get) => ({
  snap: null,
  ready: false,
  error: null,
  tab: 'status',
  subs: [],
  notices: [],

  load: async () => {
    try {
      sfx.prime()
      await repo.init()
      void requestPersist()
      const snap = await repo.snapshot()
      configureAudio({ sound: snap.settings.sound, voice: snap.settings.voice })
      set({ snap, ready: true, error: null })
      await announce(snap)
      if (!popBound) {
        popBound = true
        window.addEventListener('popstate', (e) => {
          const n = (e.state as { n?: number } | null)?.n ?? 0
          set((s) => ({ subs: s.subs.slice(0, n) }))
        })
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), ready: true })
    }
  },

  refresh: async () => {
    const snap = await repo.snapshot()
    configureAudio({ sound: snap.settings.sound, voice: snap.settings.voice })
    set({ snap })
  },

  act: async (fn) => {
    const before = get().snap
    const result = await fn()
    await get().refresh()
    const after = get().snap
    if (before && after) react(before, after, get().notify)
    return result
  },

  setTab: (tab) => {
    // leaving a sub-screen by tapping a tab clears the stack
    if (get().subs.length) {
      history.go(-get().subs.length)
      set({ subs: [] })
    }
    set({ tab })
  },
  open: (s) => {
    history.pushState({ n: get().subs.length + 1 }, '')
    set((st) => ({ subs: [...st.subs, s] }))
  },
  replace: (s) => set((st) => ({ subs: [...st.subs.slice(0, -1), s] })),
  back: () => {
    if (get().subs.length) history.back()
  },
  closeAll: () => {
    const n = get().subs.length
    if (n) history.go(-n)
    set({ subs: [] })
  },
  notify: (n) => set((s) => ({ notices: [...s.notices, { ...n, id: `${Date.now()}-${Math.random()}` }] })),
  dismissNotice: () => set((s) => ({ notices: s.notices.slice(1) })),
}))

/** Sounds + notices for what changed between two snapshots. */
function react(before: Snapshot, after: Snapshot, notify: UI['notify']) {
  const levelBefore = before.totals.level
  const levelAfter = after.totals.level
  if (levelAfter.level > levelBefore.level) {
    const ups = STAT_KEYS.filter((k) => after.totals.stats[k] > before.totals.stats[k]).map(
      (k: StatKey) => `${k}  ${before.totals.stats[k]} → ${after.totals.stats[k]}`,
    )
    sfx.levelUp()
    sfx.say(LINES.levelUp)
    notify({
      kind: 'levelup',
      title: 'LEVEL UP',
      body: `Lv.${levelBefore.level} → Lv.${levelAfter.level}`,
      lines: ups.length ? ups : undefined,
    })
  } else if (levelAfter.capped && !levelBefore.capped) {
    notify({
      kind: 'system',
      title: 'RANK EXAM AVAILABLE',
      body: `Your XP has passed the ${levelAfter.examAvailable}-Rank gate. Level is held at ${levelAfter.level} while XP keeps banking. The Rank Exam opens in a later update.`,
    })
  } else if (after.log.kept > before.log.kept && after.today === before.today) {
    sfx.tick()
    sfx.say(LINES.objective)
  }
  if (after.log.outcome === 'COMPLETE' && before.log.outcome !== 'COMPLETE' && after.today === before.today) {
    notify({
      kind: 'system',
      title: 'QUEST COMPLETE',
      body: 'Every promise kept. +25 % XP bonus (on time). The streak grows. Evidence recorded.',
    })
  }
}

/** Day-start announcements: mode change, quest arrival, penalty, recovery, support card. */
async function announce(snap: Snapshot) {
  const { notify } = useUI.getState()
  if (!snap.settings.onboarded) return
  if (snap.player.lastModeSeen !== snap.mode) {
    const m = MODE_NOTICES[snap.mode]
    notify({ kind: 'system', title: `[NOTICE] ${m.title}`, body: m.body, cta: 'Understood' })
    await repo.savePlayer({ lastModeSeen: snap.mode })
  }
  if (lsGet(ARRIVAL_KEY) !== snap.today) {
    lsSet(ARRIVAL_KEY, snap.today)
    if (snap.log.quest.penalty) {
      sfx.alarm()
      sfx.say(LINES.penalty)
      notify({
        kind: 'penalty',
        title: '[PENALTY QUEST]',
        body: `${snap.log.quest.penalty.desc} The Daily Quest still stands. Firm, not harsh: clear it before the deadline.`,
        cta: 'Accept',
      })
    } else if (snap.log.flags.recovery) {
      sfx.soft()
      sfx.say(LINES.recovery)
      notify({ kind: 'recovery', title: '[RECOVERY MODE]', body: 'Load reduced to 50 % for a few days. No penalties. This is the System shrinking so you never break. Return.', cta: 'Return' })
    } else {
      sfx.chime()
      sfx.say(LINES.arrived)
      notify({ kind: 'system', title: '[QUEST INFO]', body: 'Daily Quest has arrived. One objective at a time. The System decides; you execute.', cta: 'Begin' })
    }
    if (snap.log.flags.lowMood) {
      notify({
        kind: 'support',
        title: '[SUPPORT]',
        body: 'The last few days look heavy. Load is lighter for now, and nothing here is a penalty. Talk to someone you trust. UWC student support / counselling services are there for students.',
        cta: 'OK',
      })
    }
  }
}
