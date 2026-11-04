---
description: Monthly ARISE System Update — read the latest backup, summarise trends, update content within the safety rails, test, commit, deploy, write the update notes.
---

# /system-update

Run this once a month, after Sfundo has put his latest backup JSON (More → Settings → Export, or the Guild Report) in `exports/`.
Re-read `ARISE_SPEC.md` §11 (safety rails) and §13 first. Do not ask Sfundo design questions: decide, log each decision as one line in `DECISIONS.md`, and keep going. Stop only if physically blocked (e.g. GitHub login).

## 1. Read the backup
- Find the newest `exports/arise-backup-*.json`. If there is none, stop and tell him to export one (More → Settings → Export JSON) and put it in `exports/`.
- Validate: `app === "arise"`, `schema` ≤ the app's `SCHEMA_VERSION` (`src/data/db.ts`). Never modify the backup file. It is personal data: do not commit `exports/` (it is git-ignored) and do not paste raw journal text into commits or notes.

## 2. Summarise trends (write the summary in your reply, in plain language)
From the tables in `data`:
- **TRUST** 7- and 30-day (`dayLogs[].kept / total`), completion by objective, completion by weekday, days complete/partial/failed.
- **Load**: current Awakening Ramp week (`player.rampWeek`), Trio / steps / screen-time targets (`player.trio`, `screenTargetMin`), recovery-mode days, deloads.
- **Drift causes** (`drifts[].cause`) and re-entry speed (`reentryMin`).
- **Mirror**: which of the 13 insight chapters are unlocked (`src/engine/insights.ts`), the energy/focus peak, Easy/Hard map (`feedback`), motive profile (`motiveTags`), sleep→performance, phone→focus.
- **Fear log**: calibration (`fears`): predicted vs actual, Shadows count.
- **Forge**: Skill Gate progress (`skillGates`, `skillLevels`), books finished (`reading`), Courage rung and rejections (`courage`), GOLD ledger and Main Quest I chapters (`gold`, `player.mqDone`), puzzle rating gain, level / rank / titles.
- Compare with the previous month's notes in `src/content/updates.ts` if present.

## 3. Apply content updates (all within spec §11)
Make only changes the data justifies. Keep every change small and reversible.
1. **Targets**: if 7-day TRUST has been ≥ 85 % for the month, nothing to loosen; if < 70 %, lower the next targets one step (do not add load). Never raise any daily load above 240 min.
2. **Next Skill Gate resources**: use WebSearch to find 2–4 high-quality resources for the next skill in `src/content/skills.ts` (YouTube first; prefer videos that explain the intuition). Only add a `url` you have confirmed loads (WebFetch / official page). Otherwise use `search:` hints. Maths/statistics: Professor Leonard first. Markets stays demo-only and process-graded; no gambling or real-money trading content, ever.
3. **Hidden Quests**: add 2–4 new ones to `src/content/hiddenQuests.ts` — small, kind, real-world; no deception, no pranks, no money risk; tuned to his Easy/Hard map (more reps in Growth Zone, less in Chores).
4. **Retune** objective minutes / window text only if the data shows a window is consistently missed (e.g. move the Main Quest window to his measured focus peak: update `mainQuestWindow` default in `src/data/repo.ts`).
5. **Rank Exam draft**: refine the next unopened rank's criteria in `rankExam()` (`src/engine/forge.ts`) from his actual numbers.
6. **February update only**: propose Main Quest II from his data (candidates: scale MVELO, or launch Sneaker Spa on campus once the semester starts), and finalise SEMESTER mode (`src/engine/dailyQuest.ts`, spec §4.4). Record the choice in `DECISIONS.md`.
7. If mood chapters or low-mood triggers appear in the data, do not add load. Keep the Support card; verify any helpline number on the official organisation's website before adding it.

## 4. Verify
```bash
npm test
npm run build
```
Fix anything that fails. Do not skip tests. Never weaken a safety-rail test.

## 5. Write the update notes
Append a new entry (10 lines max, plain language, kind tone, no shaming) to `src/content/updates.ts` as `{ date, lines: string[] }`. The app shows the newest unseen entry on the next open. Include: what changed, why (one data point each), and what to expect.

## 6. Commit and deploy
- `git add -A && git commit -m "system update <YYYY-MM>: <summary>"` (do not add `exports/`).
- Deploy: `git push` (GitHub Actions publishes to Pages). If `gh auth status` fails, stop and tell Sfundo to run `gh auth login`, then `./scripts/publish.ps1` the first time.
- Report in 5 lines: trends · what changed · tests/build · deployed link · anything he must do.
