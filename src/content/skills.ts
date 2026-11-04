import type { StatKey } from '../engine/types'

export interface Resource {
  title: string
  why: string
  /** Only set when the link was confirmed to exist (official page or surfaced by search). Otherwise `search` is shown. */
  url?: string
  search?: string
}

export interface SkillDef {
  id: string
  name: string
  stats: StatKey[]
  /** Day 1 skill map. */
  subSkills: string[]
  bossTest: string
  resources: Resource[]
  /** Four weekly checkpoints for the ~20-hour month. */
  checkpoints: string[]
  /** Markets rail: demo only. */
  note?: string
}

const cp = (a: string, b: string, c: string, d: string) => [`Week 1: ${a}`, `Week 2: ${b}`, `Week 3: ${c}`, `Week 4: ${d}`]

/** The 14-skill queue (spec 7.1). Resources: YouTube first; only confirmed links are clickable. */
export const SKILLS: SkillDef[] = [
  {
    id: 'learning', name: 'Learning How to Learn', stats: ['INT'],
    subSkills: ['Retrieval practice', 'Spaced repetition', 'Interleaving', 'Memory palace', 'Teaching to learn (SEED upgrade)'],
    bossTest: 'Learn an unfamiliar hard concept in one day; teach it in a 5-minute recording.',
    resources: [
      { title: 'Learning How to Learn (Coursera, free to audit)', why: 'The standard intuition-first course on how memory and focus work.', search: 'Learning How to Learn Barbara Oakley Coursera' },
      { title: 'Retrieval practice explained (YouTube)', why: 'See the big idea before the details.', search: 'YouTube retrieval practice spaced repetition explained' },
    ],
    checkpoints: cp('Watch the course intro; test yourself without notes', 'Set up spaced review of 1 subject', 'Interleave two subjects for a week', 'Build a memory palace for 10 items'),
  },
  {
    id: 'speaking', name: 'Public Speaking & Storytelling', stats: ['NRV'],
    subSkills: ['Voice (pace, pause, volume)', 'Structure (hook, story, point)', 'Stories', 'Body language', 'Handling nerves'],
    bossTest: '5-minute talk to a live audience of at least 3 people.',
    resources: [
      { title: 'How to Speak So That People Want to Listen — Julian Treasure (TED)', why: 'Practical vocal habits in 10 minutes.', url: 'https://www.ted.com/talks/julian_treasure_how_to_speak_so_that_people_want_to_listen' },
    ],
    checkpoints: cp('Record a 1-min talk; watch it back', 'Tell one story with a clear point', 'Speak to 1 person for 3 min, no notes', 'Rehearse and give the 5-min talk'),
  },
  {
    id: 'negotiation', name: 'Negotiation', stats: ['SEN'],
    subSkills: ['Calibrated questions', 'Mirroring and labelling', 'Anchoring', 'Finding what they need', 'Walking away'],
    bossTest: 'Negotiate 3 real things (price, terms, a favour) and log the outcomes.',
    resources: [
      { title: 'Chris Voss — Never Split the Difference (Talks at Google, YouTube)', why: 'The core tactics from the book, in a talk.', search: 'Chris Voss Never Split the Difference Talks at Google' },
    ],
    checkpoints: cp('Learn mirroring + labelling; use once', 'Use calibrated "how" questions twice', 'Negotiate a small real price', 'Complete and log 3 negotiations'),
  },
  {
    id: 'chess', name: 'Chess: Tactics & Calculation', stats: ['SEN', 'INT'],
    subSkills: ['Forks / pins / skewers', 'Mates in 1-2', 'Calculation discipline', 'Blunder checks', 'Endgame basics'],
    bossTest: '+150 Lichess puzzle rating from your baseline.',
    resources: [
      { title: 'Lichess puzzles (free)', why: 'Unlimited rated tactics; your rating is the progress meter.', url: 'https://lichess.org/training' },
      { title: 'Lichess puzzle themes', why: 'Drill one motif at a time.', url: 'https://lichess.org/training/themes' },
    ],
    checkpoints: cp('20 puzzles/day; record baseline rating', 'Drill forks and pins', 'Slow down: calculate fully before moving', 'Check +150 from baseline'),
  },
  {
    id: 'sales', name: 'Sales & Cold Outreach', stats: ['NRV', 'LCK'],
    subSkills: ['Finding the right people', 'A clear one-line offer', 'Short messages', 'Follow-up', 'Handling "no"'],
    bossTest: '50 logged outreach conversations.',
    resources: [
      { title: 'Alex Hormozi on cold outreach (YouTube)', why: 'Volume, targeting and follow-up. Treat the numbers as claims, not guarantees.', search: 'Alex Hormozi cold outreach YouTube' },
      { title: '$100M Offers / $100M Leads (books)', why: 'Offer design and lead generation.', search: '$100M Leads Alex Hormozi' },
    ],
    checkpoints: cp('Write your 1-line offer; 10 conversations', '25 conversations total', '40 conversations; follow up on all', '50 logged; review what worked'),
  },
  {
    id: 'finance', name: 'Personal Finance & Investing Fundamentals', stats: ['WIS'], note: 'Education only. No gambling, no real-money trading quests.',
    subSkills: ['Budgeting', 'Compound interest', 'Risk and diversification', 'Fees and inflation', 'Behavioural traps'],
    bossTest: 'A written personal money plan.',
    resources: [
      { title: 'Khan Academy — Financial Literacy (free)', why: 'Budgeting, saving, credit, investing basics.', search: 'Khan Academy Financial Literacy course' },
      { title: 'The Psychology of Money (book)', why: 'Why behaviour beats cleverness.', search: 'Morgan Housel Psychology of Money' },
    ],
    checkpoints: cp('Track one month of spending', 'Learn compounding with a calculator', 'Learn risk and diversification', 'Write the plan'),
  },
  {
    id: 'writing', name: 'Persuasive Writing', stats: ['INT', 'WIS'],
    subSkills: ['One idea per piece', 'Strong openings', 'Clear structure', 'Editing ruthlessly', 'Publishing'],
    bossTest: 'Publish one long-form essay.',
    resources: [{ title: 'Search: how to write a persuasive essay (YouTube)', why: 'Pick one short tutorial and apply it the same day.', search: 'YouTube how to write a persuasive essay' }],
    checkpoints: cp('Pick a topic and a one-sentence thesis', 'Draft the outline', 'First draft', 'Edit and publish'),
  },
  {
    id: 'cooking', name: 'Cooking for Performance', stats: ['VIT'],
    subSkills: ['Knife and prep basics', 'Protein + vegetables', 'Batch cooking', 'Seasoning', 'Cleaning as you go'],
    bossTest: '10 different healthy meals cooked.',
    resources: [{ title: 'Search: simple healthy high-protein meals (YouTube)', why: 'Cook along; no calorie counting.', search: 'YouTube simple healthy high protein meals beginner' }],
    checkpoints: cp('3 meals', '6 meals', '8 meals incl. a batch cook', '10 different meals logged'),
  },
  {
    id: 'people', name: 'Reading People & Body Language', stats: ['SEN'],
    subSkills: ['Baselines', 'Clusters not single cues', 'Listening', 'Context', 'Checking your guesses'],
    bossTest: '20 logged observation drills.',
    resources: [{ title: 'Search: body language basics, evidence-based (YouTube)', why: 'Prefer sources that discuss limits of the research.', search: 'YouTube body language basics evidence based' }],
    checkpoints: cp('5 drills', '10 drills', '15 drills; check guesses by asking', '20 logged'),
  },
  {
    id: 'design', name: 'Design Fundamentals', stats: ['ORD'],
    subSkills: ['Hierarchy', 'Spacing', 'Type', 'Colour', 'Layout'],
    bossTest: 'Redesign one MVELO client page.',
    resources: [{ title: 'Search: UI design fundamentals for developers (YouTube)', why: 'You already build sites: learn why good ones look good.', search: 'YouTube UI design fundamentals for developers' }],
    checkpoints: cp('Audit 3 sites for hierarchy', 'Type + spacing exercises', 'Redesign a section', 'Redesign the full client page'),
  },
  {
    id: 'mental-math', name: 'Mental Math & Estimation', stats: ['INT'],
    subSkills: ['Fast addition/multiplication tricks', 'Squares', 'Percentages', 'Fermi estimates', 'Checking answers'],
    bossTest: 'A timed benchmark test.',
    resources: [{ title: 'Search: mental math tricks and Fermi estimation (YouTube)', why: 'Pick one trick a day.', search: 'YouTube mental math tricks Fermi estimation' }],
    checkpoints: cp('Take a baseline timed test', 'Learn 3 tricks', 'Daily 10-min drills', 'Repeat the benchmark and beat it'),
  },
  {
    id: 'markets', name: 'Markets & Risk', stats: ['SEN', 'WIS'], note: 'Demo account only. Graded on PROCESS, never profit. Profit or loss earns no XP.',
    subSkills: ['What moves forex', 'Risk per trade', 'Writing a trade plan', 'Journaling', 'Emotional discipline'],
    bossTest: '30 DEMO trades journaled against a written plan, graded on process.',
    resources: [{ title: 'Search: forex basics for beginners, demo account (YouTube)', why: 'Education only. Never trade real money for this quest.', search: 'YouTube forex basics beginners risk management demo account' }],
    checkpoints: cp('Write the plan and rules', '10 demo trades journaled', '20 demo trades journaled', '30 journaled; grade process only'),
  },
  {
    id: 'first-aid', name: 'First Aid', stats: ['VIT', 'NRV'],
    subSkills: ['CPR and AED', 'Bleeding control', 'Choking', 'Fractures and burns', 'Calling for help'],
    bossTest: 'An accredited course or a full practical drill.',
    resources: [
      { title: 'St John South Africa — first aid courses', why: 'Accredited training. Check current prices and dates with them.', url: 'https://stjohn.org.za/stjohn-first-aid/' },
      { title: 'South African Red Cross — training', why: 'Another accredited provider.', url: 'https://redcross.org.za/' },
    ],
    checkpoints: cp('Book a course or find a practical partner', 'Learn CPR steps', 'Practise bleeding + choking', 'Complete the course or drill'),
  },
  {
    id: 'video', name: 'Video Creation', stats: ['LCK'],
    subSkills: ['Hook', 'Script', 'Filming and light', 'Audio', 'Editing'],
    bossTest: 'Publish a 60-second explainer.',
    resources: [{ title: 'Search: how to make a 60 second explainer video (YouTube)', why: 'Follow one tutorial start to finish.', search: 'YouTube how to make a short explainer video with your phone' }],
    checkpoints: cp('Script 60 seconds', 'Film it', 'Edit it', 'Publish'),
  },
]

export const CODEX_LINKS: Resource[] = [
  { title: 'Jia Jiang — What I learned from 100 days of rejection (TED)', why: 'Why rejection practice shrinks fear.', url: 'https://www.youtube.com/watch?v=-vZXgApsPCQ' },
  { title: 'Tim Ferriss — Why you should define your fears instead of your goals (TED)', why: 'The Fear-Setting exercise.', url: 'https://www.youtube.com/watch?v=5J6jAC6XxAI' },
]
