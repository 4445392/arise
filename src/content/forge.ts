import type { StatKey } from '../engine/types'

// ----------------------------------------------------------------- Library (the System's reading order)
export const LIBRARY = [
  ['Atomic Habits', 'James Clear'],
  ['The Courage to Be Disliked', 'Ichiro Kishimi & Fumitake Koga'],
  ['Make It Stick', 'Peter Brown, Henry Roediger & Mark McDaniel'],
  ['Range', 'David Epstein'],
  ['Deep Work', 'Cal Newport'],
  ['The Scout Mindset', 'Julia Galef'],
  ['Peak', 'Anders Ericsson & Robert Pool'],
  ['Meditations', 'Marcus Aurelius (Gregory Hays translation)'],
  ['$100M Offers', 'Alex Hormozi'],
  ['Never Split the Difference', 'Chris Voss'],
  ['The Psychology of Money', 'Morgan Housel'],
  ['Mastery', 'Robert Greene'],
  ['The Almanack of Naval Ravikant', 'Eric Jorgenson'],
  ['Thinking, Fast and Slow', 'Daniel Kahneman'],
  ['The Luck Factor', 'Richard Wiseman'],
  ['Influence', 'Robert Cialdini'],
  ['The Art of War', 'Sun Tzu'],
  ["Man's Search for Meaning", 'Viktor Frankl'],
].map(([title, author]) => ({ title, author }))

// ----------------------------------------------------------------- Courage Ladder
export const DEFAULT_RUNGS = [
  'Greet 3 strangers',
  'Ask a stranger for directions or a recommendation',
  'Ask a question in a lecture, tutorial or meeting',
  'Give a stranger a genuine compliment',
  'Ask for a discount or upgrade (expect a no — the rep is the win)',
  'Post a piece of your work publicly',
  'Message 3 people you admire with one specific question',
  'Walk into a local business and pitch MVELO in person',
  'Speak in front of a group',
  'Ask for something big (a mentor meeting, a high-ticket sale, an opportunity)',
]
export const COURAGE_RULES = 'Never pranks or deception. Never make anyone uncomfortable. Respect every "no". A rejection is a WIN.'

// ----------------------------------------------------------------- Main Quest I: First Blood
export const MAIN_QUEST_I = {
  title: 'First Blood',
  goal: 'R10,000 earned through MVELO Studio from new clients by 28 Feb 2027.',
  targetZar: 10_000,
  deadline: '2027-02-28',
  chapters: [
    { id: 'arsenal', name: 'Arsenal', desc: 'A one-page MVELO portfolio: the Yengwayo Designs website and the POS system as case studies, plus your price tiers (R1,000 · R2,500 · R5,000–10,000 · R15,000–25,000 · R30,000+).' },
    { id: 'offer', name: 'Offer', desc: 'One clear starter offer for small businesses and a one-paragraph pitch.' },
    { id: 'hunt', name: 'Hunt', desc: '50 outreach conversations (in person, WhatsApp, email). Rejections are celebrated.', counter: 50 },
    { id: 'contract', name: 'First Contract', desc: 'First new client signed (deposit received).' },
    { id: 'deliver', name: 'Deliver', desc: 'Ship it and collect a testimonial.' },
    { id: 'revenue', name: 'R10,000', desc: 'Cumulative new-client revenue in the GOLD ledger reaches R10,000.' },
  ],
}
export const MONEY_MILESTONES: [string, string][] = [
  ['E', 'First R100 from a skill'],
  ['D', 'R1,000 in a month'],
  ['C', 'R5,000 / month'],
  ['B', 'R15,000 / month'],
  ['A', 'R50,000 / month'],
  ['S', 'R100,000 / month'],
]

// ----------------------------------------------------------------- Emergency quests (Lv8+) and Gates
export interface Timeboxed { id: string; title: string; desc: string; minutes: number; xp: number; stats: StatKey[] }
export const EMERGENCY: Timeboxed[] = [
  { id: 'e-outreach', title: '60 minutes: 5 outreach messages', desc: 'Send 5 genuine outreach messages to potential MVELO clients in 60 minutes.', minutes: 60, xp: 200, stats: ['LCK', 'NRV'] },
  { id: 'e-ship', title: '45 minutes: ship one thing', desc: 'Finish and publish or send one piece of work in 45 minutes. Good enough beats perfect.', minutes: 45, xp: 180, stats: ['ORD', 'WIL'] },
  { id: 'e-learn', title: '60 minutes: learn and teach', desc: 'Learn one concept from scratch and teach it aloud (recorded) in 60 minutes.', minutes: 60, xp: 200, stats: ['INT', 'NRV'] },
  { id: 'e-reset', title: '30 minutes: full reset', desc: 'Clean your space, clear your inbox of one thing, plan tomorrow.', minutes: 30, xp: 140, stats: ['ORD', 'WIS'] },
]
export const GATES: { rank: string; title: string; desc: string }[] = [
  { rank: 'E', title: 'Gate E: One-page site', desc: '2–3 h sprint. Boss deliverable: a single-page site for yourself or a friend, live by the bell.' },
  { rank: 'D', title: 'Gate D: Landing page + pitch', desc: '2–3 h sprint. Boss: a landing page for a real small-business idea and a 60-second pitch.' },
  { rank: 'C', title: 'Gate C: Mini product', desc: '3 h sprint. Boss: a working tiny tool a client could use.' },
  { rank: 'B', title: 'Gate B: Client-ready package', desc: '3 h sprint. Boss: a priced, written proposal with a demo.' },
  { rank: 'A', title: 'Gate A: Launch', desc: '3 h sprint. Boss: something shipped to real users with a feedback loop.' },
  { rank: 'S', title: 'Gate S: Scale', desc: '3 h sprint. Boss: a system that earns without you in the loop for one task.' },
]
