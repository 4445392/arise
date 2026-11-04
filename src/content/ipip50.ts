/**
 * IPIP Big-Five factor markers (50 items), Goldberg (1992). International Personality Item Pool: public domain,
 * https://ipip.ori.org . Item wording and scoring keys transcribed from the published 50-item marker set.
 * NOTE: not re-verified against ipip.ori.org inside this build — see DECISIONS.md.
 * Scale: 1 Very inaccurate · 2 Moderately inaccurate · 3 Neither · 4 Moderately accurate · 5 Very accurate.
 */
export type Factor = 'E' | 'A' | 'C' | 'N' | 'O'

export interface IpipItem {
  n: number
  factor: Factor
  /** 1 = scored as answered, -1 = reverse-keyed */
  key: 1 | -1
  text: string
}

export const FACTOR_NAMES: Record<Factor, string> = {
  E: 'Extraversion',
  A: 'Agreeableness',
  C: 'Conscientiousness',
  N: 'Neuroticism (emotional reactivity)',
  O: 'Openness / intellect',
}

type Row = [string, 1 | -1]

const SETS: Record<Factor, Row[]> = {
  E: [
    ['Am the life of the party.', 1],
    ["Don't talk a lot.", -1],
    ['Feel comfortable around people.', 1],
    ['Keep in the background.', -1],
    ['Start conversations.', 1],
    ['Have little to say.', -1],
    ['Talk to a lot of different people at parties.', 1],
    ["Don't like to draw attention to myself.", -1],
    ["Don't mind being the center of attention.", 1],
    ['Am quiet around strangers.', -1],
  ],
  A: [
    ['Feel little concern for others.', -1],
    ['Am interested in people.', 1],
    ['Insult people.', -1],
    ["Sympathize with others' feelings.", 1],
    ["Am not interested in other people's problems.", -1],
    ['Have a soft heart.', 1],
    ['Am not really interested in others.', -1],
    ['Take time out for others.', 1],
    ["Feel others' emotions.", 1],
    ['Make people feel at ease.', 1],
  ],
  C: [
    ['Am always prepared.', 1],
    ['Leave my belongings around.', -1],
    ['Pay attention to details.', 1],
    ['Make a mess of things.', -1],
    ['Get chores done right away.', 1],
    ['Often forget to put things back in their proper place.', -1],
    ['Like order.', 1],
    ['Shirk my duties.', -1],
    ['Follow a schedule.', 1],
    ['Am exacting in my work.', 1],
  ],
  N: [
    ['Get stressed out easily.', 1],
    ['Am relaxed most of the time.', -1],
    ['Worry about things.', 1],
    ['Seldom feel blue.', -1],
    ['Am easily disturbed.', 1],
    ['Get upset easily.', 1],
    ['Change my mood a lot.', 1],
    ['Have frequent mood swings.', 1],
    ['Get irritated easily.', 1],
    ['Often feel blue.', 1],
  ],
  O: [
    ['Have a rich vocabulary.', 1],
    ['Have difficulty understanding abstract ideas.', -1],
    ['Have a vivid imagination.', 1],
    ['Am not interested in abstract ideas.', -1],
    ['Have excellent ideas.', 1],
    ['Do not have a good imagination.', -1],
    ['Am quick to understand things.', 1],
    ['Use difficult words.', 1],
    ['Spend time reflecting on things.', 1],
    ['Am full of ideas.', 1],
  ],
}

export const IPIP_ITEMS: IpipItem[] = (['E', 'A', 'C', 'N', 'O'] as Factor[]).flatMap((factor, fi) =>
  SETS[factor].map(([text, key], i) => ({ n: fi * 10 + i + 1, factor, key, text })),
)

export const SCALE_LABELS = ['Very inaccurate', 'Moderately inaccurate', 'Neither', 'Moderately accurate', 'Very accurate']
