/** ~30 values for the card sort. Self-knowledge, not a design choice: he picks his own top 5. */
export const VALUES = [
  'Achievement', 'Adventure', 'Authenticity', 'Autonomy', 'Balance', 'Belonging', 'Compassion', 'Courage', 'Creativity', 'Curiosity',
  'Discipline', 'Family', 'Fairness', 'Faith', 'Freedom', 'Friendship', 'Growth', 'Health', 'Honesty', 'Humour',
  'Integrity', 'Knowledge', 'Leadership', 'Mastery', 'Wealth', 'Peace', 'Respect', 'Service', 'Status', 'Security',
]

export const THINKING_TRAPS = [
  { id: 'catastrophising', name: 'Catastrophising ("Murphy")', example: '"It will definitely go wrong."', antidote: 'What is the most likely outcome, and what would I do if the worst actually happened?' },
  { id: 'mind-reading', name: 'Mind-reading', example: '"They think I\'m stupid."', antidote: 'What evidence do I have? What else could explain it?' },
  { id: 'all-or-nothing', name: 'All-or-nothing (perfectionism)', example: '"If it isn\'t perfect, it\'s worthless."', antidote: 'What would 70 % done look like, and is it enough to ship?' },
  { id: 'fortune-telling', name: 'Fortune-telling', example: '"I already know how this ends."', antidote: 'How often have my predictions been right? (Check the Fear Log.)' },
  { id: 'should', name: 'Should-statements', example: '"I should be further along by now."', antidote: 'Swap "should" for "I would like to" — what is the next small step?' },
  { id: 'discounting', name: 'Discounting wins', example: '"That doesn\'t count."', antidote: 'If a friend had done this, would I count it?' },
] as const
