export interface Law {
  n: number
  title: string
  body: string
}

export const LAWS: Law[] = [
  { n: 1, title: 'Small, daily, non-negotiable', body: 'Small, daily, non-negotiable beats big and occasional.' },
  { n: 2, title: 'Evidence only', body: 'Stats only rise from logged real actions. The System never flatters — it shows evidence.' },
  { n: 3, title: 'Trust is earned', body: 'The bar rises only after promises are kept (≥ 85 %).' },
  { n: 4, title: 'Never miss twice', body: 'When you fall, the System shrinks — it never breaks.' },
  { n: 5, title: 'One next action', body: 'The System decides; the Player executes.' },
  { n: 6, title: 'Fear is data', body: 'Predict it, log it, compare it with reality.' },
  { n: 7, title: 'Protect the engine', body: 'Sleep, food and rest are quests too.' },
]
