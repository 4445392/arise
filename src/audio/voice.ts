// Web Speech API voice lines. Deep English voice if the device has one, rate 0.9.
let enabled = true
let cached: SpeechSynthesisVoice | null | undefined

export function setVoiceEnabled(v: boolean) {
  enabled = v
}

const DEEP = /(david|daniel|alex|male|george|mark|james|google uk english male|fred|guy)/i

function pickVoice(): SpeechSynthesisVoice | null {
  if (cached !== undefined) return cached
  if (typeof speechSynthesis === 'undefined') return (cached = null)
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null // not loaded yet; try again next time
  const en = voices.filter((v) => /^en/i.test(v.lang))
  cached = en.find((v) => DEEP.test(v.name)) ?? en.find((v) => /en-(gb|us|za)/i.test(v.lang)) ?? en[0] ?? null
  return cached
}

export function speak(text: string): void {
  if (!enabled || typeof speechSynthesis === 'undefined') return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice()
    if (v) u.voice = v
    u.lang = v?.lang ?? 'en-US'
    u.rate = 0.9
    u.pitch = 0.65
    u.volume = 1
    speechSynthesis.speak(u)
  } catch {
    /* speech is a bonus, never a blocker */
  }
}

export const LINES = {
  arrived: 'Daily Quest has arrived.',
  objective: 'Objective complete.',
  levelUp: 'Level up.',
  penalty: 'Penalty quest issued.',
  ret: 'Return.',
  recovery: 'Load reduced. Return.',
} as const

export function primeVoices() {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.onvoiceschanged = () => {
    cached = undefined
  }
  speechSynthesis.getVoices()
}
