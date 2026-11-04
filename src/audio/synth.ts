// Web Audio synthesis — every sound is generated at runtime, no audio files.
let ctx: AudioContext | null = null
let muted = false

export function setMuted(m: boolean) {
  muted = m
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

interface Tone {
  f: number
  t: number // start offset (s)
  d: number // duration (s)
  type?: OscillatorType
  g?: number
  slideTo?: number
}

function play(tones: Tone[]) {
  if (muted) return
  const c = ac()
  if (!c) return
  const now = c.currentTime
  for (const t of tones) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = t.type ?? 'sine'
    o.frequency.setValueAtTime(t.f, now + t.t)
    if (t.slideTo) o.frequency.exponentialRampToValueAtTime(t.slideTo, now + t.t + t.d)
    const peak = t.g ?? 0.12
    g.gain.setValueAtTime(0.0001, now + t.t)
    g.gain.exponentialRampToValueAtTime(peak, now + t.t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + t.t + t.d)
    o.connect(g).connect(c.destination)
    o.start(now + t.t)
    o.stop(now + t.t + t.d + 0.05)
  }
}

/** Quest arrives: bright system chime. */
export const chime = () =>
  play([
    { f: 880, t: 0, d: 0.5, type: 'triangle' },
    { f: 1320, t: 0.12, d: 0.7, type: 'sine', g: 0.1 },
    { f: 1760, t: 0.24, d: 0.9, type: 'sine', g: 0.05 },
  ])

/** Objective ticked. */
export const tick = () => play([{ f: 1040, t: 0, d: 0.12, type: 'square', g: 0.05 }, { f: 1560, t: 0.06, d: 0.14, type: 'square', g: 0.04 }])

/** Level-up fanfare. */
export const levelUp = () =>
  play([
    { f: 523, t: 0, d: 0.25, type: 'triangle' },
    { f: 659, t: 0.15, d: 0.25, type: 'triangle' },
    { f: 784, t: 0.3, d: 0.25, type: 'triangle' },
    { f: 1047, t: 0.45, d: 0.9, type: 'triangle', g: 0.14 },
    { f: 1568, t: 0.45, d: 0.9, type: 'sine', g: 0.06 },
  ])

/** Penalty alarm: low two-tone siren. */
export const alarm = () =>
  play([
    { f: 330, t: 0, d: 0.3, type: 'sawtooth', g: 0.08 },
    { f: 247, t: 0.3, d: 0.3, type: 'sawtooth', g: 0.08 },
    { f: 330, t: 0.6, d: 0.3, type: 'sawtooth', g: 0.08 },
    { f: 247, t: 0.9, d: 0.4, type: 'sawtooth', g: 0.08 },
  ])

/** ARISE swell (Shadow extraction, flourishes). */
export const arise = () =>
  play([
    { f: 110, t: 0, d: 1.6, type: 'sawtooth', g: 0.07, slideTo: 220 },
    { f: 165, t: 0.1, d: 1.5, type: 'triangle', g: 0.07, slideTo: 330 },
    { f: 880, t: 1.2, d: 0.8, type: 'sine', g: 0.08 },
  ])

/** Calm, low cue (recovery, end of ignition). */
export const soft = () => play([{ f: 392, t: 0, d: 0.5, type: 'sine', g: 0.07 }, { f: 523, t: 0.2, d: 0.6, type: 'sine', g: 0.05 }])
