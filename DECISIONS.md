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

## Phase 2 (data)
- All 25 entity tables are in Dexie schema v1 up front — later phases need no migration. Teach-back audio blobs (`recordings`) are device-local and excluded from JSON backups.
- One-off awards (Boss Raid show-up/result, re-entry bonus, urge resisted) live in an `events` ledger; everything else is derived from DayLogs. Total XP = Σ DayLog.xp + Σ events.
- The +25 % COMPLETE bonus needs every objective finished by lights-out; late logging still counts as kept (streak, TRUST) but forfeits the bonus (spec 3, "on-time bonus").
- Days nobody opened are closed as FAILED at rollover (penalty / recovery rules apply) — the System shrinks, it never breaks.
- "Urge resisted" gives +3 WIL stat-XP (spec says "+1 WIL"; a whole stat point costs 40+, so I read it as a small bump). Re-entry within 30 min gives +5 XP and +4 WIL stat-XP.
- Boss Raid XP: 150 for showing up, +75 when the result is logged (spec gave no numbers).
- Import validates app/schema/tables before touching anything and replaces data atomically in one transaction.

## Phase 3 (core UI)
- Navigation is a tab bar plus a sub-screen stack wired to browser history, so the phone's back gesture works.
- The Dungeon timer uses wall-clock timestamps and persists to localStorage, so it survives screen-off and app switches.
- Day-start announcements (mode change, quest arrival chime + voice, penalty alarm, recovery notice) fire once per game day.
- Support card (spec 11 rule 7) lists UWC student support / counselling and NO helpline number — none verified yet; a verified number can be added in a later update.
- Penalty "Dragon" is generic until the Mirror's Easy/Hard map exists (Phase 6).
- Shop / Titles / History / Player Manual show LOCKED or COMING teasers; they are built in later phases.
- Rank Exams are Phase 7: if XP passes the Lv9 gate before then, the level is held and a RANK EXAM AVAILABLE notice shows while XP keeps banking.
