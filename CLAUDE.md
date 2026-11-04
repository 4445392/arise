# ARISE — working rules for Claude Code

Full spec: ARISE_SPEC.md — re-read the relevant section before each phase.

## Rules
1. Do not ask Sfundo design questions. Decide, log one line in DECISIONS.md (decision — reason), keep going. Stop only when physically blocked (e.g. GitHub login).
2. Build in the order of spec §12. After every phase: run `npm test` and `npm run build`, fix failures, commit (`phase N: <summary>`), then report in 3 lines: what works · what's next · what Sfundo must do.
3. Stop after Phase 4 (Exam Mode MVP, deployed). Wait for the user to type `continue`, then build Phases 5–8.
4. The engine (`src/engine`) is pure: no React, no Dexie, no `Date.now()`; time is passed in. The UI never computes game rules.
5. Mobile-first: every screen works at 375 px wide, one-handed.
6. Original names, art, sound only. No Solo Leveling (or other franchise) assets, names, fonts, audio.
7. Safety rails (spec §11) override everything: no gambling/trading quests, no deception, no calorie/fasting quests, never under 7 h in bed, 240-min daily cap, never shame, all data local.

## Stack
Vite + React + TypeScript (strict) + Tailwind CSS 4 · Zustand (UI state) · Dexie/IndexedDB (data) · Recharts · date-fns + date-fns-tz · vite-plugin-pwa · Vitest.
No backend, accounts, analytics or API keys. Vite `base: '/arise/'`.

## Folder map
- `src/engine/` — pure game logic (xp, stats, ranks, trust, dailyQuest, penalties, vitals, insights, fear, unlocks, rng, day) + tests
- `src/content/` — static content (laws, exam copy, later: skills, library, courage, titles, shop…)
- `src/data/` — Dexie schema, repositories, export/import
- `src/ui/` — design-system components + screens
- `src/audio/` — Web Audio synth, Web Speech voice
- `public/` — icons; `scripts/` — icon generator
- `.github/workflows/deploy.yml` — GitHub Pages deploy

## Commands
`npm run dev` · `npm test` · `npm run build` · `npm run preview`

## Files to keep current
DECISIONS.md (every judgement call) · README.md (run / test / deploy / phone install)
