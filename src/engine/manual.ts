import { hashSeed } from './rng'
import type { Insight } from './insights'

export const MOTIVES = ['money', 'mastery', 'recognition', 'avoiding the penalty', 'curiosity', 'duty/family', 'health', 'proving myself'] as const

/** Ask "What got you to do this?" on roughly 1 in 3 completions (deterministic per objective + day). */
export function shouldAskMotive(key: string, day: string): boolean {
  return hashSeed(`${day}|${key}`) % 3 === 0
}

export interface ManualSection {
  title: string
  text: string
  unlocked: boolean
}

const find = (xs: readonly Insight[], id: string) => xs.find((i) => i.id === id)
const need = (i: Insight | undefined) => (i ? `Not enough data yet (${i.sample} so far; needs ${i.need}).` : 'Not enough data yet.')
const use = (i: Insight | undefined, fn: (i: Insight) => string) => (i?.unlocked ? `${fn(i)} (n=${i.sample})` : need(i))

/** The Player Manual: "How <name> works". Never claims causation; always shows sample size. */
export function buildManual(insights: readonly Insight[]): ManualSection[] {
  const energy = find(insights, 'energy')
  const focus = find(insights, 'focus')
  const eh = find(insights, 'easyHard')
  const drift = find(insights, 'drift')
  const motive = find(insights, 'motivation')
  const sleep = find(insights, 'sleep')
  const phone = find(insights, 'phone')
  const fear = find(insights, 'fear')
  const traps = find(insights, 'traps')
  const delay = find(insights, 'startDelay')
  const detail = (eh?.detail as { map?: Record<string, string[]>; dragon?: string | null } | undefined) ?? {}
  const map = detail.map ?? {}
  const sec = (title: string, i: (Insight | undefined)[], text: string): ManualSection => ({ title, text, unlocked: i.some((x) => x?.unlocked) })
  return [
    sec('Best hours', [energy, focus], [use(energy, (i) => i.headline), use(focus, (i) => i.headline)].join(' ')),
    sec('What drains me', [energy, sleep, phone], [use(energy, (i) => i.headline.split(', ').slice(-1)[0]), use(sleep, (i) => i.headline), use(phone, (i) => i.headline)].join(' ')),
    sec('What drives me', [motive], use(motive, (i) => i.headline)),
    sec('My natural talents', [eh], eh?.unlocked ? `Easy and enjoyable: ${map['Natural Talents']?.join(', ') || 'none yet'}. Hard but enjoyable (growth zone): ${map['Growth Zone']?.join(', ') || 'none yet'}. (n=${eh.sample})` : need(eh)),
    sec('My dragons', [eh], eh?.unlocked ? `Hard and disliked: ${map['Dragons']?.join(', ') || 'none yet'}. Current Dragon: ${detail.dragon ?? 'none'}. Chores (easy, disliked): ${map['Chores']?.join(', ') || 'none'}. (n=${eh.sample})` : need(eh)),
    sec('The trap to watch', [traps, fear], [use(traps, (i) => i.headline), use(fear, (i) => i.headline)].join(' ')),
    sec('What I do when I drift', [drift], use(drift, (i) => i.headline)),
    sec('How to restart me', [delay, drift], [use(delay, (i) => i.headline), 'Default restart: shrink the task, open it, do one line, 2 minutes. Then decide.'].join(' ')),
  ]
}

export function manualText(name: string, sections: readonly ManualSection[]): string {
  return [`HOW ${name.toUpperCase()} WORKS`, '', ...sections.flatMap((s) => [s.title.toUpperCase(), s.text, ''])].join('\n').trim()
}
