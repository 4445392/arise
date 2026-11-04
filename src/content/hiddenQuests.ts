import type { StatKey } from '../engine/types'

export interface HiddenQuest {
  id: string
  title: string
  desc: string
  stats: StatKey[]
  xp: number
}

/** Hidden Quests (Lv3+): small, kind, real-world. No deception, no gambling (spec 11). */
export const HIDDEN_QUESTS: HiddenQuest[] = [
  { id: 'ask-rec', title: 'Ask a stranger', desc: 'Ask someone you do not know for a recommendation (food, a book, a route). Thank them.', stats: ['NRV', 'LCK'], xp: 60 },
  { id: 'cook-new', title: 'New healthy meal', desc: 'Cook a healthy meal you have never made before.', stats: ['VIT', 'ORD'], xp: 60 },
  { id: 'teach-friend', title: 'Teach a friend', desc: 'Teach one concept you learned this week to a friend or classmate.', stats: ['INT', 'NRV'], xp: 60 },
  { id: 'delete-app', title: 'Delete one app', desc: 'Delete one app you do not truly need.', stats: ['FOC', 'WIL'], xp: 40 },
  { id: 'via', title: 'Know your strengths', desc: 'Take the free VIA Character Strengths survey on the official VIA Institute site and log your top 5.', stats: ['WIS'], xp: 80 },
  { id: 'compliment', title: 'Genuine compliment', desc: 'Give someone a specific, genuine compliment.', stats: ['NRV', 'SEN'], xp: 50 },
  { id: 'new-person', title: 'Meet someone new', desc: 'Start a conversation with someone you have not spoken to before.', stats: ['LCK', 'NRV'], xp: 60 },
  { id: 'declutter', title: 'Clear one surface', desc: 'Clear and reset one cluttered surface (desk, shelf, bag).', stats: ['ORD'], xp: 40 },
  { id: 'walk-new', title: 'A new route', desc: 'Walk a route you have never walked, for 20 minutes. No headphones.', stats: ['VIT', 'SEN'], xp: 50 },
  { id: 'show-work', title: 'Show your work', desc: 'Show something you built to one person and ask for one honest improvement.', stats: ['LCK', 'NRV'], xp: 70 },
  { id: 'observe', title: 'Read the room', desc: 'In one conversation today, notice the other person’s mood and what they care about. Write one line.', stats: ['SEN', 'WIS'], xp: 50 },
  { id: 'thank', title: 'A real thank-you', desc: 'Send a specific thank-you message to someone who helped you.', stats: ['WIS', 'LCK'], xp: 40 },
  { id: 'plan-week', title: 'Design the week', desc: 'Spend 10 minutes writing the three things that would make this week a win.', stats: ['ORD', 'WIS'], xp: 40 },
  { id: 'mobility', title: 'Mobility flow', desc: 'Do a 15-minute mobility or stretching session.', stats: ['VIT', 'STR'], xp: 40 },
]
