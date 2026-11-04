import * as synth from './synth'
import { LINES, primeVoices, setVoiceEnabled, speak } from './voice'

export { LINES }

/** Apply the Player's sound / voice settings. */
export function configureAudio(opts: { sound: boolean; voice: boolean }) {
  synth.setMuted(!opts.sound)
  setVoiceEnabled(opts.voice)
}

export const sfx = {
  chime: synth.chime,
  tick: synth.tick,
  levelUp: synth.levelUp,
  alarm: synth.alarm,
  arise: synth.arise,
  soft: synth.soft,
  say: speak,
  prime: primeVoices,
}
