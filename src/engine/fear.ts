export type FearOutcome = 'true' | 'partly' | 'no' | 'better'

export interface FearRec {
  id: string | number
  /** Predicted probability that the fear comes true, 0-100. */
  predicted: number
  severity: number // 1-10
  outcome?: FearOutcome | null
}

export interface Calibration {
  logged: number
  resolved: number
  cameTrue: number
  partly: number
  didntHappen: number
  better: number
  /** % of resolved fears that fully came true. */
  pctTrue: number | null
  avgPredicted: number | null
  buckets: { label: string; avgPredicted: number; actual: number; n: number }[]
}

const BUCKETS: [number, number, string][] = [
  [0, 20, '0-20'],
  [21, 40, '21-40'],
  [41, 60, '41-60'],
  [61, 80, '61-80'],
  [81, 100, '81-100'],
]

export function calibration(fears: readonly FearRec[]): Calibration {
  const resolved = fears.filter((f) => f.outcome)
  const count = (o: FearOutcome) => resolved.filter((f) => f.outcome === o).length
  const cameTrue = count('true')
  const avgPredicted = resolved.length ? resolved.reduce((s, f) => s + f.predicted, 0) / resolved.length : null
  const buckets = BUCKETS.map(([lo, hi, label]) => {
    const inB = resolved.filter((f) => f.predicted >= lo && f.predicted <= hi)
    return {
      label,
      n: inB.length,
      avgPredicted: inB.length ? inB.reduce((s, f) => s + f.predicted, 0) / inB.length : 0,
      // "true" counts fully, "partly" counts half
      actual: inB.length
        ? (inB.reduce((s, f) => s + (f.outcome === 'true' ? 1 : f.outcome === 'partly' ? 0.5 : 0), 0) / inB.length) * 100
        : 0,
    }
  }).filter((b) => b.n > 0)
  return {
    logged: fears.length,
    resolved: resolved.length,
    cameTrue,
    partly: count('partly'),
    didntHappen: count('no'),
    better: count('better'),
    pctTrue: resolved.length ? (cameTrue / resolved.length) * 100 : null,
    avgPredicted,
    buckets,
  }
}

/** "You predicted disaster X times. It happened Y times." */
export function disasterLine(fears: readonly FearRec[]): string {
  const c = calibration(fears)
  return `You predicted disaster ${c.resolved} time${c.resolved === 1 ? '' : 's'}. It happened ${c.cameTrue} time${c.cameTrue === 1 ? '' : 's'}.`
}

/** Fears whose check-back date has arrived and are not resolved. */
export function checkBacksDue<T extends { checkBack: string; outcome?: FearOutcome | null }>(fears: readonly T[], today: string): T[] {
  return fears.filter((f) => !f.outcome && f.checkBack <= today)
}
