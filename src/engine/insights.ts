import { hourOf } from './day'
import { calibration, type FearRec } from './fear'
import type { ObjectiveId } from './types'

// ---- record shapes the insights read (data layer maps its rows to these) ----
export interface PulseRec {
  ts: number
  dayKey: string
  energy: number
  focus: number
  mood: number
  activity: string
  urge: boolean
}
export interface RatingRec {
  objective: ObjectiveId | string
  difficulty: number
  enjoyment: number
  startDelayMin?: number | null
}
export interface DriftRec {
  ts: number
  cause: string
}
export interface MotiveRec {
  motive: string
}
export interface SessionRec {
  startTs: number
  minutes: number
  quality: number
}
export interface DayRec {
  dayKey: string
  sleepHours?: number | null
  completionPct?: number | null
  deepWorkMin?: number | null
  screenMin?: number | null
}
export interface AuditRec {
  traps: Record<string, number>
}
export interface SkillRec {
  name: string
  hours: number
  daysActive: number
  avgEnjoyment: number
}

export interface InsightInput {
  pulses: PulseRec[]
  ratings: RatingRec[]
  drifts: DriftRec[]
  motives: MotiveRec[]
  sessions: SessionRec[]
  days: DayRec[]
  fears: FearRec[]
  audits: AuditRec[]
  /** IPIP factor means 1-5, present once the test is done. */
  ipip?: { E: number; A: number; C: number; N: number; O: number } | null
  /** Top-5 values from the card sort, once done. */
  values?: string[] | null
  skills: SkillRec[]
  level: number
}

export type InsightId =
  | 'energy'
  | 'focus'
  | 'easyHard'
  | 'drift'
  | 'motivation'
  | 'sleep'
  | 'phone'
  | 'startDelay'
  | 'fear'
  | 'traps'
  | 'personality'
  | 'values'
  | 'signature'

export interface Insight {
  id: InsightId
  title: string
  unlocked: boolean
  /** Sample size shown next to every claim. */
  sample: number
  need: string
  headline: string
  detail?: unknown
}

export const INSIGHT_IDS: InsightId[] = [
  'energy',
  'focus',
  'easyHard',
  'drift',
  'motivation',
  'sleep',
  'phone',
  'startDelay',
  'fear',
  'traps',
  'personality',
  'values',
  'signature',
]

// ---------------------------------------------------------------- helpers
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

function rank(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0])
  const out = new Array<number>(xs.length)
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
    const r = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) out[idx[k][1]] = r
    i = j + 1
  }
  return out
}

/** Spearman rank correlation. null when undefined (n < 3 or no variance). */
export function spearman(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null
  const rx = rank(x)
  const ry = rank(y)
  const mx = avg(rx)
  const my = avg(ry)
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my)
    dx += (rx[i] - mx) ** 2
    dy += (ry[i] - my) ** 2
  }
  if (dx === 0 || dy === 0) return null
  return num / Math.sqrt(dx * dy)
}

function locked(id: InsightId, title: string, sample: number, need: string): Insight {
  return { id, title, unlocked: false, sample, need, headline: `Locked — ${need}` }
}

/** Best contiguous window of `width` hours by mean value, over hour buckets with data. */
function bestWindow(byHour: Map<number, number[]>, width: number, dir: 'max' | 'min'): { start: number; end: number; mean: number; n: number } | null {
  let best: { start: number; end: number; mean: number; n: number } | null = null
  const eps = 1e-9
  for (let start = 0; start < 24; start++) {
    const vals: number[] = []
    for (let k = 0; k < width; k++) vals.push(...(byHour.get((start + k) % 24) ?? []))
    if (vals.length < 3) continue
    const mean = avg(vals)
    const better = !best || (dir === 'max' ? mean > best.mean + eps : mean < best.mean - eps) || (Math.abs(mean - best.mean) <= eps && vals.length > best.n)
    if (better) best = { start, end: start + width, mean, n: vals.length }
  }
  if (best) {
    // trim edge hours that hold no data so the window is honest about what was measured
    while (best.end - best.start > 1 && !byHour.has(best.start % 24)) best.start++
    while (best.end - best.start > 1 && !byHour.has((best.end - 1) % 24)) best.end--
  }
  return best
}

// ---------------------------------------------------------------- chapters
function energy(inp: InsightInput): Insight {
  const need = '≥ 21 Pulses over ≥ 7 days'
  const days = new Set(inp.pulses.map((p) => p.dayKey)).size
  if (inp.pulses.length < 21 || days < 7) return locked('energy', 'Energy curve', inp.pulses.length, need)
  const byHour = new Map<number, number[]>()
  for (const p of inp.pulses) {
    const h = hourOf(p.ts)
    byHour.set(h, [...(byHour.get(h) ?? []), p.energy])
  }
  const peak = bestWindow(byHour, 2, 'max')
  const dip = bestWindow(byHour, 2, 'min')
  const peakTxt = peak ? `${hh(peak.start)}–${hh(peak.start + 2)}` : 'unclear'
  const dipTxt = dip ? `${hh(dip.start)}–${hh(dip.start + 2)}` : 'unclear'
  return {
    id: 'energy',
    title: 'Energy curve',
    unlocked: true,
    sample: inp.pulses.length,
    need,
    headline: `Energy peaks ${peakTxt}, dips ${dipTxt}.`,
    detail: { peak, dip },
  }
}

function focus(inp: InsightInput): Insight {
  const need = '≥ 21 Pulses + ≥ 10 Dungeon sessions'
  if (inp.pulses.length < 21 || inp.sessions.length < 10) return locked('focus', 'Focus peak', Math.min(inp.pulses.length, inp.sessions.length), need)
  const byHour = new Map<number, number[]>()
  for (const s of inp.sessions) {
    const h = hourOf(s.startTs)
    byHour.set(h, [...(byHour.get(h) ?? []), s.quality])
  }
  const best = bestWindow(byHour, 3, 'max')
  const txt = best ? `${hh(best.start)}–${hh(best.start + 3)}` : 'unclear'
  return {
    id: 'focus',
    title: 'Focus peak',
    unlocked: true,
    sample: inp.sessions.length,
    need,
    headline: best ? `Your best deep work is ${txt}.` : 'No clear focus peak yet.',
    detail: { peakStartHour: best?.start ?? null },
  }
}

export type Quadrant = 'Natural Talents' | 'Growth Zone' | 'Chores' | 'Dragons'

export function quadrantOf(difficulty: number, enjoyment: number): Quadrant {
  const easy = difficulty < 3
  const enjoy = enjoyment >= 3
  if (easy && enjoy) return 'Natural Talents'
  if (!easy && enjoy) return 'Growth Zone'
  if (easy && !enjoy) return 'Chores'
  return 'Dragons'
}

function easyHard(inp: InsightInput): Insight {
  const need = '≥ 30 objective ratings'
  if (inp.ratings.length < 30) return locked('easyHard', 'Easy/Hard map', inp.ratings.length, need)
  const by = new Map<string, RatingRec[]>()
  for (const r of inp.ratings) by.set(r.objective, [...(by.get(r.objective) ?? []), r])
  const map: Record<Quadrant, string[]> = { 'Natural Talents': [], 'Growth Zone': [], Chores: [], Dragons: [] }
  let dragon: { name: string; score: number } | null = null
  for (const [name, rs] of by) {
    if (rs.length < 3) continue
    const d = avg(rs.map((r) => r.difficulty))
    const e = avg(rs.map((r) => r.enjoyment))
    map[quadrantOf(d, e)].push(name)
    const score = d - e
    if (quadrantOf(d, e) === 'Dragons' && (!dragon || score > dragon.score)) dragon = { name, score }
  }
  return {
    id: 'easyHard',
    title: 'Easy/Hard map',
    unlocked: true,
    sample: inp.ratings.length,
    need,
    headline: dragon ? `Current Dragon: ${dragon.name}.` : 'No Dragon found yet.',
    detail: { map, dragon: dragon?.name ?? null },
  }
}

function drift(inp: InsightInput): Insight {
  const need = '≥ 10 drifts'
  if (inp.drifts.length < 10) return locked('drift', 'Drift triggers', inp.drifts.length, need)
  const counts = new Map<string, number>()
  for (const d of inp.drifts) counts.set(d.cause, (counts.get(d.cause) ?? 0) + 1)
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const [topCause, topN] = sorted[0]
  const hours = new Map<number, number[]>()
  for (const d of inp.drifts.filter((x) => x.cause === topCause)) {
    const h = hourOf(d.ts)
    hours.set(h, [...(hours.get(h) ?? []), 1])
  }
  const win = bestWindow(hours, 2, 'max')
  const when = win ? `, mostly ${hh(win.start)}–${hh(win.start + 2)}` : ''
  return {
    id: 'drift',
    title: 'Drift triggers',
    unlocked: true,
    sample: inp.drifts.length,
    need,
    headline: `${pct(topN, inp.drifts.length)} % of drifts start with "${topCause}"${when}.`,
    detail: { causes: sorted },
  }
}

function motivation(inp: InsightInput): Insight {
  const need = '≥ 20 motivation tags'
  if (inp.motives.length < 20) return locked('motivation', 'Motivation profile', inp.motives.length, need)
  const counts = new Map<string, number>()
  for (const m of inp.motives) counts.set(m.motive, (counts.get(m.motive) ?? 0) + 1)
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return {
    id: 'motivation',
    title: 'Motivation profile',
    unlocked: true,
    sample: inp.motives.length,
    need,
    headline: `You show up most for ${sorted[0][0]}${sorted[1] ? `, then ${sorted[1][0]}` : ''}.`,
    detail: { ranking: sorted },
  }
}

function sleep(inp: InsightInput): Insight {
  const need = '≥ 14 days with sleep + completion'
  const rows = inp.days.filter((d) => d.sleepHours != null && d.completionPct != null)
  if (rows.length < 14) return locked('sleep', 'Sleep → performance', rows.length, need)
  const rho = spearman(rows.map((r) => r.sleepHours as number), rows.map((r) => r.completionPct as number))
  const short = rows.filter((r) => (r.sleepHours as number) < 7)
  const ok = rows.filter((r) => (r.sleepHours as number) >= 7)
  let headline = 'Not enough contrast between short and full nights yet.'
  if (short.length >= 3 && ok.length >= 3) {
    const a = avg(ok.map((r) => r.completionPct as number))
    const b = avg(short.map((r) => r.completionPct as number))
    if (a > 0) {
      const drop = Math.round(((a - b) / a) * 100)
      headline = drop > 0 ? `After nights under 7 h, completion drops ${drop} %.` : `After nights under 7 h, completion did not drop (${drop} %).`
    }
  }
  return {
    id: 'sleep',
    title: 'Sleep → performance',
    unlocked: true,
    sample: rows.length,
    need,
    headline: `${headline} (correlation, not proof)`,
    detail: { rho },
  }
}

function phone(inp: InsightInput): Insight {
  const need = '≥ 14 screen-time logs'
  const rows = inp.days.filter((d) => d.screenMin != null && d.deepWorkMin != null)
  if (rows.length < 14) return locked('phone', 'Phone → focus', rows.length, need)
  const over = rows.filter((r) => (r.screenMin as number) > 240)
  const under = rows.filter((r) => (r.screenMin as number) <= 240)
  let headline = 'Not enough high- and low-screen days to compare yet.'
  if (over.length >= 3 && under.length >= 3) {
    const a = avg(under.map((r) => r.deepWorkMin as number))
    const b = avg(over.map((r) => r.deepWorkMin as number))
    if (a > 0) headline = `On days over 4 h of screen time, deep work is ${Math.round((b / a) * 100)} % of your usual (${Math.round(b)} vs ${Math.round(a)} min).`
  }
  return { id: 'phone', title: 'Phone → focus', unlocked: true, sample: rows.length, need, headline: `${headline} (correlation, not proof)` }
}

function startDelay(inp: InsightInput): Insight {
  const need = '≥ 30 objectives with a start delay'
  const rows = inp.ratings.filter((r) => r.startDelayMin != null)
  if (rows.length < 30) return locked('startDelay', 'Start delay', rows.length, need)
  const by = new Map<string, number[]>()
  for (const r of rows) by.set(r.objective, [...(by.get(r.objective) ?? []), r.startDelayMin as number])
  const means = [...by.entries()].filter(([, v]) => v.length >= 3).map(([k, v]) => [k, avg(v)] as const).sort((a, b) => a[1] - b[1])
  const fast = means[0]
  const slow = means[means.length - 1]
  return {
    id: 'startDelay',
    title: 'Start delay',
    unlocked: true,
    sample: rows.length,
    need,
    headline: fast && slow && fast[0] !== slow[0] ? `You start fast on ${fast[0]} (avg ${Math.round(fast[1])} min), slow on ${slow[0]} (avg ${Math.round(slow[1])} min).` : 'Start times are similar across objectives.',
    detail: { means },
  }
}

function fear(inp: InsightInput): Insight {
  const need = '≥ 5 resolved fears'
  const c = calibration(inp.fears)
  if (c.resolved < 5) return locked('fear', 'Fear calibration', c.resolved, need)
  return {
    id: 'fear',
    title: 'Fear calibration',
    unlocked: true,
    sample: c.resolved,
    need,
    headline: `You predict ${Math.round(c.avgPredicted ?? 0)} %; it happens ${Math.round(c.pctTrue ?? 0)} % of the time.`,
    detail: c,
  }
}

function traps(inp: InsightInput): Insight {
  const need = '≥ 4 Thought Audits'
  if (inp.audits.length < 4) return locked('traps', 'Thinking traps', inp.audits.length, need)
  const totals = new Map<string, number>()
  for (const a of inp.audits) for (const [k, v] of Object.entries(a.traps)) totals.set(k, (totals.get(k) ?? 0) + v)
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
  return {
    id: 'traps',
    title: 'Thinking traps',
    unlocked: true,
    sample: inp.audits.length,
    need,
    headline: sorted.length ? `Top trap: ${sorted[0][0]}.` : 'No traps ticked yet.',
    detail: { ranking: sorted },
  }
}

export type Band = 'low' | 'average' | 'high'
export function band(mean: number): Band {
  if (mean < 2.67) return 'low'
  if (mean <= 3.67) return 'average'
  return 'high'
}

function personality(inp: InsightInput): Insight {
  const need = 'IPIP-50 completed'
  if (!inp.ipip) return locked('personality', 'Personality', 0, need)
  const bands = Object.fromEntries(Object.entries(inp.ipip).map(([k, v]) => [k, band(v)])) as Record<string, Band>
  return {
    id: 'personality',
    title: 'Personality',
    unlocked: true,
    sample: 50,
    need,
    headline: `Extraversion ${bands.E}, Agreeableness ${bands.A}, Conscientiousness ${bands.C}, Emotional stability ${bands.N === 'high' ? 'low' : bands.N === 'low' ? 'high' : 'average'}, Openness ${bands.O}.`,
    detail: { bands },
  }
}

function values(inp: InsightInput): Insight {
  const need = 'Values card sort completed'
  if (!inp.values || inp.values.length === 0) return locked('values', 'Values', 0, need)
  return { id: 'values', title: 'Values', unlocked: true, sample: inp.values.length, need, headline: `Top values: ${inp.values.slice(0, 5).join(', ')}.` }
}

function signature(inp: InsightInput): Insight {
  const need = 'Lv20 + ≥ 5 Skill Gates'
  if (inp.level < 20 || inp.skills.length < 5) return locked('signature', 'Signature Skills', inp.skills.length, need)
  const ranked = inp.skills
    .map((s) => ({ name: s.name, score: (s.hours / Math.max(1, s.daysActive)) * s.avgEnjoyment }))
    .sort((a, b) => b.score - a.score)
  const top = ranked.slice(0, 2).map((r) => r.name)
  return { id: 'signature', title: 'Signature Skills', unlocked: true, sample: inp.skills.length, need, headline: `Nominated: ${top.join(' and ')}.`, detail: { ranked } }
}

export function computeInsights(inp: InsightInput): Insight[] {
  return [energy(inp), focus(inp), easyHard(inp), drift(inp), motivation(inp), sleep(inp), phone(inp), startDelay(inp), fear(inp), traps(inp), personality(inp), values(inp), signature(inp)]
}

/** DECODED % = unlocked chapters / total chapters. */
export function decodedPct(insights: readonly Insight[]): number {
  if (!insights.length) return 0
  return Math.round((insights.filter((i) => i.unlocked).length / insights.length) * 100)
}
