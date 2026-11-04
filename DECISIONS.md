# DECISIONS

One line each: decision — reason.

## Phase 0
- Vite 8 + React 19 + Tailwind 4 (`@tailwindcss/vite`) + Vitest 5 — latest stable versions; no `tailwind.config` needed.
- Scaffolded by hand (not `create-vite`) — avoids interactive prompts.
- Package manager npm — default, already installed.
- Engine tests run in Node; data tests use `fake-indexeddb` — keeps the engine pure and the data layer testable.
- `gh` CLI is not installed on this machine — deploy workflow is written; Sfundo must install `gh` and run `gh auth login` (the one allowed stop).
- Fonts via @fontsource (Rajdhani + Inter, latin subset) instead of the Google Fonts CDN — same fonts, bundled so the PWA works fully offline.

## Phase 1 (engine)
- Completion % and TRUST are count-based (objectives kept ÷ objectives) — simplest rule that matches "every objective is a promise".
- A day is COMPLETE only when every objective is done; ≥70 % is PARTIAL; a Penalty Quest left uncleared forces FAILED (spec 5.5).
- Each objective has a unique `key` (id, or `RITUAL:<examId>`) so several Pre-Boss Rituals can coexist in one day.
- Level curve is a piecewise-linear table of cumulative XP anchors fitted to a simulation (steady ~290 XP/day at 85 % full-protocol days); Lv2 costs 250 XP and Lv5 1,400 XP so early levels come fast.
- "85 % completion" in the simulation = 85 % of days the whole quest is finished; on other days each objective is finished with p = 0.5. Rank Exams are assumed passed the day after they open.
- Stat-XP uses the specified 10 per objective × a calibration factor of 1.5, so the average stat reaches ~50 after 12 months at 85 %.
- Stat spread follows the spec's tags (INT appears in many objectives so it rises fastest) — not rebalanced, spec-faithful.
- EXAM-mode Sundays swap Body for Active Recovery (the spec only defines Sunday for BREAK).
- EXAM-mode habit minutes: Awaken 5 · Body 25 (gym 45) · Teach-back 3 · Library 10 · Shutdown 12 · Ritual 8; study (Dungeon) minutes come from a daily study target (default 120).
- HP = (sleep/8)^1.5 × 70 + quality × 30; MP = energy × 60 + mood × 40; fatigue +1 per full-load day at HP < 60, deload at 3; low-mood load cut lasts while the 5-of-7 condition holds plus 2 days.
- Insight windows trim hours with no data and tie-break by sample size; every chapter shows its sample size and correlation chapters say "correlation, not proof".
- Daily XP is derived (recomputed from progress), not accumulated, so re-ticking an objective can never double-award.
