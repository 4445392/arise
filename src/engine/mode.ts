import type { Mode } from './types'

export interface ModeConfig {
  /** Last exam day (inclusive). EXAM runs from install to this day. */
  lastExamDay: string
  /** First day of the next semester. BREAK runs between. */
  restartDay: string
  /** Optional extra EXAM windows in a semester (e.g. 14 days before the first exam), inclusive. */
  examWindows?: { from: string; to: string }[]
}

/** The game mode for a game day. Pure: depends only on dates. */
export function modeForDay(day: string, cfg: ModeConfig): Mode {
  if (day <= cfg.lastExamDay) return 'EXAM'
  if (day < cfg.restartDay) return 'BREAK'
  if (cfg.examWindows?.some((w) => day >= w.from && day <= w.to)) return 'EXAM'
  return 'SEMESTER'
}

export const MODE_NOTICES: Record<Mode, { title: string; body: string }> = {
  EXAM: {
    title: 'EXAM MODE',
    body: 'Protect the exams. Your study blocks are the Dungeons. Only a small set of new habits. Courage, Strategy, Skill Gates and the Main Quest are locked until the final boss falls.',
  },
  BREAK: {
    title: 'TRAINING ARC',
    body: 'The exams are behind you. The full protocol opens, starting at about half load. The early quests are meant to look pointless. Return daily.',
  },
  SEMESTER: {
    title: 'SEMESTER MODE',
    body: 'Coursework joins the Dungeon rotation. Skill Gate 20 minutes, Library 15. The freed time goes back to rest.',
  },
}
