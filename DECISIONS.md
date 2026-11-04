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

## Phase 5 (systems)
- Shadow = a RESOLVED fear (check-back done); ARISE pays 40 XP + 4 per severity point and NRV stat-XP. Shadow rank follows severity (1-2 E ... 10 S).
- Hidden Quests: 14 in the pool, 1-2 per week on random Mon-Sat days (seeded per week), open until Sunday, 40-80 XP, optional. VIA survey item points to the official VIA Institute site, no link hard-coded.
- Guild Report: week = Monday-Sunday; Weekly Focus Stat (weakest stat, ties by stat order) is applied when the report is opened on Sunday.
- Backup reminder shows on Sundays or 7+ days since the last export. .ics has wake (weekday/weekend), focus window, Shutdown (30 min before lights-out), Sunday report, all with alarms.


## Phase 6 (the Mirror)
- IPIP-50 items and scoring keys were transcribed from memory of Goldberg's public-domain marker set (no web access in this build) and credited to ipip.ori.org; they have NOT been re-verified against the site. Verify once online and correct src/content/ipip50.ts if anything differs.
- Bands: mean < 2.67 low, 2.67-3.67 average, > 3.67 high (thirds of the 1-5 scale). Neuroticism is shown as 'Emotional stability' inverted in the personality chapter.
- Feedback sheet (difficulty + enjoyment) appears after every objective completes; the motive question appears on ~1 in 3 (deterministic hash of objective+day). Start delay = first interaction minus wake time.
- Values card sort is two-stage (keep what matters, then pick exactly 5). 'Who I'm becoming' is three prompted sentences.
- Schema v2 adds a time index to assessments (Dexie migration, no data change).
- Insights now read real feedback, motive tags, thought audits and assessments; DECODED % = unlocked chapters / 13.

## Phase 7 (the Forge)
- Skill resources: only links confirmed to exist (official pages, or surfaced by web search / given in the spec) are clickable; everything else shows a search phrase instead of a guessed URL. Professor Leonard's channel and the Coursera / Voss / Hormozi links could not be confirmed to an exact URL, so they are search hints, not links.
- Trio starts at 50 % of the tested max (min 5) and steps +10 % (min +2, cap 100) each week under the TRUST rule, together with steps (+500, cap 10,000) and the screen-time target (-10 % a week, floor 120 min). A pain flag swaps Body for mobility for 3 days and pauses Trio progression.
- 'Cheat meal' in the Shop is named 'Treat meal' (safety rail 4: no food-restriction framing). Rewards above D-rank were added by me (day out R3000, bigger treat 6000).
- Rank Exams: D and C exactly as in the spec; B, A, S are drafts (skill gates, shadows, TRUST, DECODED, courage level, monthly GOLD) to be refined at System Updates. The exam opens only once XP passes the gate; passing releases the banked level.
- Emergency Quests: ~one per fortnight on a deterministic day, daytime only (08:00-22:00 shown), Lv8+, never in EXAM mode. Gates: Saturdays after D-rank, 250 XP.
- Titles: bonuses applied as an all-XP multiplier (Keeper of Promises) or a stat-XP multiplier; Merchant's Main Quest XP bonus and Job passives are displayed but not yet applied to XP (Phase 8 / System Update).
- Signature Skills use cleared gates: hours per active day x average enjoyment (feedback on the Skill Gate objective).
- Teach-back recording uses MediaRecorder, stored in IndexedDB on the device, purged after 30 days, excluded from JSON backups.
- B-rank+ Gate content, Main Quest II and SEMESTER finalisation happen at the February System Update.

## Phase 8 (polish and QA)
- Lighthouse (v12, production build, mobile emulation): performance 96-97, accessibility 100, best practices 100, SEO 100. Lighthouse 12 no longer has a PWA category, so PWA installability was verified directly: valid manifest (standalone, scope /arise/, 192/512 + maskable icons), active service worker, and a Playwright test that reloads the app OFFLINE.
- Playwright installed cleanly: 2 smoke tests (onboarding, Quest ticking, reload persistence, every tab with no horizontal scroll at 375 px, offline reload, Fear Log). Run with npm run e2e.
- The e2e run caught a real bug (Fear Log list needed a ts index): fixed with Dexie schema v3 and a regression test.
- Recharts is lazy-loaded (History, Fear Log chart, Thought Audit trend) to keep first paint fast. Form labels now wrap their inputs.
- /system-update lives in .claude/commands/system-update.md; update notes live in src/content/updates.ts and show once on the next app open.
- Not done: Job passives and the Merchant title's Main Quest XP bonus are displayed but not applied to XP; B-rank+ exam criteria and Gate content are drafts for the monthly updates; sound/voice and the install flow are untested on a real phone.
