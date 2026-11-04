import { IPIP_ITEMS, type Factor } from '../content/ipip50'

export type IpipScores = Record<Factor, number>

/** answers: item number (1-50) -> 1..5. Returns factor means 1..5, or null if any item is missing. */
export function scoreIpip(answers: Record<number, number>): IpipScores | null {
  const sums: Record<Factor, number> = { E: 0, A: 0, C: 0, N: 0, O: 0 }
  for (const it of IPIP_ITEMS) {
    const a = answers[it.n]
    if (!(a >= 1 && a <= 5)) return null
    sums[it.factor] += it.key === 1 ? a : 6 - a
  }
  return Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, Math.round((v / 10) * 100) / 100])) as IpipScores
}

const PLAIN: Record<Factor, Record<'low' | 'average' | 'high', string>> = {
  E: { low: 'You recharge alone and prefer depth to volume. Outreach will cost energy — plan recovery after it.', average: 'You flex between social and solo modes depending on the situation.', high: 'People and activity give you energy. Use that for outreach, and watch for scrolling as a social substitute.' },
  A: { low: 'You are direct and competitive. Negotiation suits you; keep warmth visible in relationships.', average: 'You balance cooperation and standing your ground.', high: 'You are warm and cooperative. Practise saying no and asking for more.' },
  C: { low: 'Structure does not come naturally. Systems and deadlines (this app) matter more for you.', average: 'You are organised when it matters and loose when it does not.', high: 'You like order and follow-through. Watch for perfectionism delaying starts.' },
  N: { low: 'You stay steady under stress.', average: 'Stress affects you sometimes, like most people.', high: 'You feel stress and low mood more strongly — which also makes you perceptive. The Fear Log and Thought Audit are built for this.' },
  O: { low: 'You prefer the practical and proven.', average: 'You mix practical with curious.', high: 'You are idea-driven and curious. Breadth comes easily; protect time to finish things.' },
}
export const plainMeaning = (f: Factor, band: 'low' | 'average' | 'high') => PLAIN[f][band]
