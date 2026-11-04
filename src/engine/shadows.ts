import type { Rank } from './ranks'

const SKIP = new Set(['that', 'i', 'ill', "i'll", 'im', "i'm", 'will', 'would', 'might', 'could', 'they', 'people', 'be', 'am', 'the', 'a', 'an', 'to', 'my', 'will', 'just', 'going', 'gonna', 'what', 'if'])

/** "Shadow of [fear in <= 4 words]". */
export function shadowName(fear: string): string {
  const words = fear
    .replace(/[^\p{L}\p{N}\s'’-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  let i = 0
  while (i < words.length - 1 && SKIP.has(words[i].toLowerCase())) i++
  const core = words.slice(i, i + 4)
  const title = core.length ? core.join(' ') : 'the unknown'
  return `Shadow of ${title.charAt(0).toUpperCase()}${title.slice(1)}`
}

/** Shadow rank from fear severity 1-10. */
export function shadowRank(severity: number): Rank {
  if (severity <= 2) return 'E'
  if (severity <= 4) return 'D'
  if (severity <= 6) return 'C'
  if (severity <= 8) return 'B'
  if (severity === 9) return 'A'
  return 'S'
}

export const EXTRACTION_XP = 40
