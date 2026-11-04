import type { ObjectiveSpec } from '../engine/types'
import { useUI } from './store'

/** What the START button does for each kind of objective. */
export function startObjective(o: ObjectiveSpec) {
  const ui = useUI.getState()
  if (o.id === 'RITUAL') return ui.open({ name: 'fear', examId: Number(o.ref), compose: true })
  if (o.id === 'SHUTDOWN') return ui.open({ name: 'shutdown' })
  if (o.kind === 'timer') return ui.open({ name: 'timer', key: o.key })
  // checklist objectives live in the Quest window
  ui.closeAll()
  ui.setTab('quest')
}

export const STAT_FULL: Record<string, string> = {
  STR: 'Strength',
  VIT: 'Vitality',
  INT: 'Intellect',
  FOC: 'Focus',
  WIL: 'Willpower',
  ORD: 'Order',
  NRV: 'Nerve',
  WIS: 'Wisdom',
  SEN: 'Sense',
  LCK: 'Luck',
}

export function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}
