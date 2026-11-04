export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'ELITE'

/** Level at which each rank begins. Rank Exams guard these boundaries. */
export const RANK_START: Record<Rank, number> = { E: 1, D: 10, C: 25, B: 45, A: 65, S: 85, ELITE: 100 }
export const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S', 'ELITE']
export const MAX_LEVEL = 100

export function rankForLevel(level: number): Rank {
  let r: Rank = 'E'
  for (const k of RANK_ORDER) if (level >= RANK_START[k]) r = k
  return r
}

/** Next rank to earn given the ranks whose exams are passed (E is always held). */
export function nextRankToEarn(passed: readonly Rank[]): Rank | null {
  for (const r of RANK_ORDER.slice(1)) if (!passed.includes(r)) return r
  return null
}

/** Highest level reachable: one below the first unpassed rank boundary. */
export function levelCap(passed: readonly Rank[]): number {
  const next = nextRankToEarn(passed)
  return next ? RANK_START[next] - 1 : MAX_LEVEL
}
