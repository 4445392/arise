export interface SystemUpdate {
  /** Unique, e.g. "2026-11-launch" or "2026-12". The newest unseen entry is shown once on app open. */
  id: string
  date: string
  lines: string[]
}

/** System Update notes, newest LAST. /system-update appends one entry (<= 10 lines) each month. */
export const UPDATES: SystemUpdate[] = [
  {
    id: '2026-11-launch',
    date: '2026-11-04',
    lines: [
      'ARISE is online. EXAM mode protects your exams.',
      'Your study blocks are the Dungeons; the rest is small on purpose.',
      'Morning check-in sets HP and MP. Low HP shrinks the load, never punishes.',
      'I DRIFTED always opens Re-entry: one line, two minutes.',
      'Log fears before big days; compare them with what happened.',
      'After the final exam the Training Arc opens at half load.',
      'Back up every Sunday: More, Settings, Export.',
    ],
  },
]
