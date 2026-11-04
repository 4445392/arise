# ARISE — Build Specification

> **For Claude Code.** Read this entire file before writing any code. It is the single source of truth.

---

## 0. Operating rules for Claude Code

1. **Do not ask Sfundo design questions.** He has handed every design decision to the System. When something here is unspecified, make the most sensible call, record it in `DECISIONS.md` (one line: decision — reason), and keep going. Only stop when you are physically blocked (e.g. GitHub login).
2. **First action:** create `CLAUDE.md` (under 80 lines) with these rules, the stack (§10), the folder map, and the line "Full spec: ARISE_SPEC.md — re-read the relevant section before each phase."
3. Build in the order of §12. After every phase: run tests and the production build, fix failures, commit (`phase N: <summary>`), then report in 3 lines: what works · what's next · anything Sfundo must do.
4. **Stop after Phase 4** (Exam Mode MVP, deployed). Give the URL and phone-install steps. Wait until he types `continue`, then build Phases 5–8 under the same rules.
5. The game engine is pure and fully tested (§10). The UI never computes game rules itself.
6. Mobile-first: every screen works at 375 px wide, one-handed.
7. Original names, art and sound only (§9). The inspiration is *Solo Leveling*, but use no assets, character names, logos, fonts or audio from it or any other franchise.
8. The safety rails in §11 override everything else in this file.

---

## 1. The Player

- **Name:** Sfundo · **Time zone:** Africa/Johannesburg.
- 2nd-year UWC student (Computer Science, Maths, Statistics). Runs **MVELO Studio** (websites and POS systems); has built a ~34k-line Java POS (Spring Boot server + JavaFX tills) and a client website (Yengwayo Designs). Trains at the gym 4×/week (Mon, Wed, Thu, Sat); goal: lose fat, keep strength. Plays chess. Interested in philosophy, economics and markets.
- **Learning style:** visual + auditory; needs the big idea before the details. His own learning loop is **SEED**: Simplify → Expand → Explain back → Drill. For maths/stats, Professor Leonard's YouTube lectures come first.
- **What he wants (his words, condensed):** to master himself — know how he thinks, how he operates, what motivates him, what's easy and what's hard for him — and become a capable all-rounder ("jack of all trades") with: high IQ, high energy, self-discipline, high standards, organisation, calculated risk-taking, diligence, focus, money drive, luck, wisdom, cunning, confidence.
- **Core problem:** he struggles to trust himself, worries about what people think and "what if it doesn't go my way" — and feels Murphy's Law then proves him right.
- **His four enemies (confirmed by him):** ① phone & scrolling ② overthinking before starting ③ taking on too much, then crashing ④ drifting from the plan.
- **Evidence from his past routines:** rigid time-slot schedules broke within days (one long block displaced everything after it), and a packed schedule became unsustainable within weeks. **Design consequences:** deadline-based quests (not fixed slots), a deliberately small start, a hard load cap.

---

## 2. The big idea

ARISE is a personal **System**: an ordinary person receives daily quests that look pointless, but they compound into power. It has two halves that feed each other:

| | THE MIRROR — decodes him | THE FORGE — trains him |
|---|---|---|
| Does | Measures energy, focus, mood, drift, motivation, fears, what's easy/hard | Daily 4-hour quest, a new skill every month, a quarterly real-world Main Quest, courage training |
| Produces | A living **Player Manual** ("how Sfundo works") | **10 stats**, level, rank, skills, real income |
| Progress meter | **DECODED %** | Level and rank E → S → ELITE |

- The Mirror tunes the Forge: it moves deep work to his real peak hours, adjusts difficulty, and decides which skills to deepen.
- **Breadth first, then depth:** after ~5 Skill Gates, the Mirror nominates 1–2 **Signature Skills** from evidence (fastest progress × highest enjoyment).

### The 7 Laws of the System (show on an in-app "Laws" page)

1. Small, daily, non-negotiable beats big and occasional.
2. Stats only rise from logged real actions. The System never flatters — it shows evidence.
3. Trust is earned. The bar rises only after promises are kept (≥ 85 %).
4. Never miss twice. When you fall, the System shrinks — it never breaks.
5. One next action. The System decides; the Player executes.
6. Fear is data. Predict it, log it, compare it with reality.
7. Protect the engine. Sleep, food and rest are quests too.

---

## 3. Modes and time

| Mode | When | Purpose |
|---|---|---|
| **EXAM** | Install → day after his last exam (he says it's after 25 Nov 2026; exact date set in Pre-Awakening) | Protect exams. His existing study blocks are the Dungeons; only ~30–45 min of new habits. |
| **BREAK — "Training Arc"** | Day after last exam → university restart (default 1 Feb 2027, editable) | Full protocol. Opens with the **Full Awakening** (Day 0). |
| **SEMESTER** | From restart | Coursework joins the Dungeon rotation (§4.4). |

- Modes switch automatically by date, each with a full-screen `[NOTICE]`.
- **Day boundary:** 04:00 → 03:59 local (Africa/Johannesburg). Logs after midnight belong to the day they finish.
- **Deadline:** lights-out (default 00:00). Objectives logged between lights-out and 03:59 still count but lose the on-time bonus.
- Defaults: wake 08:00 weekdays / 09:00 weekends · lights-out 00:00 · gym Mon/Wed/Thu/Sat. All editable.

---

## 4. The Daily Quest

Arrives at wake time with the quest chime and the voice line "Daily Quest has arrived."
Objectives have **recommended windows, never fixed slots.** Only two anchors are fixed: waking and Shutdown.

- **COMPLETE** = all objectives → +25 % XP bonus, streak +1.
- **PARTIAL** = ≥ 70 % → no bonus, no penalty, streak holds.
- **FAILED** = < 70 % → Penalty Quest tomorrow (§5.5).

### 4.1 EXAM mode (now → last exam)

| # | Objective | Target | Stats |
|---|---|---|---|
| 1 | AWAKEN | Up at wake time, no snooze · bed made · 500 ml water · no phone for 30 min | WIL, VIT |
| 2 | BODY | Gym day: session done and logged. Other days: Daily Trio 10 push-ups / 10 squats / 10 sit-ups + 15-min walk | STR, VIT |
| 3 | EXAM DUNGEONS | Each planned study block logged (subject + minutes) with the phone in another room; SEED prompts shown in the timer | INT, FOC, WIL |
| 4 | TEACH-BACK | Explain one big idea from today's study out loud for 2 minutes | INT, NRV |
| 5 | LIBRARY | 5 pages or 10 min of audio | WIS |
| 6 | SHUTDOWN | 3 Pulses done · 3-line Night Journal · tomorrow's first study block named · lights out on time | WIS, ORD, VIT |
| + | PRE-BOSS RITUAL (night before and morning of each exam) | Fear Log entry: "I'm afraid that…", odds %, if-then plan | NRV, WIS |

- Each exam is a **BOSS RAID** (subject + date entered in Pre-Awakening): XP for showing up; bonus XP when he logs the result later.
- Courage, Strategy, Skill Gates and the Main Quest show as `LOCKED — after the final boss`.

### 4.2 BREAK mode — the full 240 minutes

| # | Objective | Full target | Min | Stats | Recommended window |
|---|---|---|---|---|---|
| 1 | AWAKEN | Wake time, no snooze · bed · 500 ml water · no phone 30 min | 5 | WIL, VIT | On waking |
| 2 | BODY | Gym day: session done + logged. Other days: Daily Trio (§4.5) + walk to steps target | 60 | STR, VIT | Morning |
| 3 | STILLNESS | Breath-counting meditation | 10 | FOC, WIS | Morning |
| 4 | MAIN QUEST DUNGEON | Deep work on the Main Quest (§7.4), phone in another room | 60 | FOC, WIL, SEN, LCK | Peak focus window (default 09:00–12:00 until the Mirror finds his real peak) |
| 5 | SKILL GATE | Deliberate practice on this month's skill (§7.1) | 40 | Per skill | Any |
| 6 | LIBRARY | Read or listen (audiobooks count — drive time is training time) | 20 | WIS, INT | Any |
| 7 | STRATEGY | Chess puzzles on Lichess (free) — log count + puzzle rating | 10 | SEN, INT | Any |
| 8 | COURAGE | Today's Risk Quest (§7.3) | 10 | NRV, LCK | Daytime |
| 9 | TEACH-BACK | Explain today's most important idea aloud (2-min recording) | 5 | INT, NRV | Evening |
| 10 | MIRROR & SHUTDOWN | 3 Pulses · Night Journal · drift review · 5-min reset (desk, bag, clothes) · plan tomorrow's top 3 · lights out | 20 | WIS, ORD, VIT | Last 30 min before lights-out |
| | | | **240** | | |

- Gym sessions often run longer than 60 min; the budget still counts them as 60. Never add objectives to compensate.
- **Sunday = REST & REVIEW:** only Awaken, Active Recovery (30-min walk or mobility), Library, and the Weekly Guild Report (§6.7). About 90 min.

### 4.3 The Awakening Ramp (anti-crash — non-negotiable)

BREAK mode starts at about half load. The early quests are meant to look pointless.

| Objective | Week 1 | Week 2 | Week 3 | Week 4+ |
|---|---|---|---|---|
| Awaken | 5 | 5 | 5 | 5 |
| Body | 40 | 50 | 55 | 60 |
| Stillness | 3 | 5 | 8 | 10 |
| Main Quest Dungeon | 25 | 40 | 50 | 60 |
| Skill Gate | 20 | 30 | 35 | 40 |
| Library | 10 | 15 | 20 | 20 |
| Strategy | 5 | 10 | 10 | 10 |
| Courage | 5 | 10 | 10 | 10 |
| Teach-back | 2 | 3 | 5 | 5 |
| Mirror & Shutdown | 10 | 15 | 20 | 20 |
| **Total (min)** | **125** | **183** | **218** | **240** |

- Advance one column per week **only if** 7-day TRUST ≥ 85 %. Hold at 70–85 %. Step back one column below 70 %.
- The same advance/hold/step-back rule governs every numeric target (Trio reps, steps, screen-time target).

### 4.4 SEMESTER mode (draft — finalise at the February System Update)

- Dungeon rotation: Mon/Wed/Fri = coursework (subject-tagged, SEED); Tue/Thu/Sat = Main Quest.
- Skill Gate 20 min, Library 15 min; the freed time goes back to rest, not to new objectives.
- Switch to EXAM mode 14 days before the first exam (dates entered in Settings).

### 4.5 The Daily Trio (the "pointless" quest that compounds)

- Push-ups, bodyweight squats, sit-ups (crunches if his lower back complains). Only on non-gym days.
- Start (from the Full Awakening test): daily target = 50 % of his max, split into sets of ≤ 25 (tap-a-set buttons).
- Progression: +10 % per week (minimum +2) under the §4.3 trust rule; cap 100 each — the "final form" (≈ 4 months away).
- Walk: steps target = baseline + 1,000; +500 per week; cap 10,000. Walking, not running, by default (kinder to joints at his bodyweight, and he prefers no cardio sessions).
- Pain flag on any exercise → mobility swap for that exercise for 3 days.

---

## 5. Game layer

### 5.1 Stats

| Stat | His traits | Rises from |
|---|---|---|
| STR | Body | Body objective, gym logs, Trio progress, personal records |
| VIT | High energy | ≥ 7 h sleep, Awaken, steps, on-time Shutdown, Sunday rest |
| INT | High IQ | Dungeons, Teach-back, Library, Strategy |
| FOC | Focus | Deep work with phone away, Stillness, screen time under target, urges resisted |
| WIL | Self-discipline, diligence | Daily Quest completion, Awaken, penalty quests cleared, re-entries |
| ORD | Organisation, high standards | Shutdown reset + plan, Guild Report, shipped deliverables, declared swaps |
| NRV | Confidence, calculated risk | Courage quests, Shadows extracted, Teach-back, Pre-Boss Rituals |
| WIS | Wisdom, self-knowledge | Library, Night Journal, Pulses, Thought Audits, decision reviews |
| SEN | Cunning (strategy, reading people & situations) | Strategy puzzles, negotiation/sales reps, decision calibration |
| LCK | Luck | Only surface-area actions: asking, outreach, publishing work, meeting new people, saying yes to invitations; Luck Journal entries |

- In-app notes. *INT:* "Adult IQ scores are fairly stable. The System trains applied intelligence: knowledge, reasoning, learning speed and better methods." *LCK:* "You can't control luck. You can increase your exposure to it: do more, and tell more people what you do."
- Every stat starts at 10 (the Full Awakening may set 8–14 from baselines). Cost to raise a stat from n to n+1 = `40 + 4·(n − 10)` stat-XP. Each completed objective gives 10 stat-XP split across its tagged stats. Calibrate so a stat trained daily at full protocol reaches ≈ 50 after 12 months.
- No stat decay. A stat untrained for 7+ days shows a "RUST" tag (visual only).

### 5.2 XP, levels, ranks

- Objective XP = its planned minutes (Dungeons: logged minutes, capped at 2× planned; in EXAM mode, Dungeon XP is capped at 180/day). Multipliers: completion bonus ×1.25 · phone-away Dungeon ×1.25 · Weekly Focus Stat objectives ×1.5 · equipped Title bonus.
- Calibrate the level curve with a simulation test so BREAK-mode full protocol at 85 % completion reaches: Lv10 ≈ day 30 · Lv25 ≈ day 120 · Lv45 ≈ month 12 · Lv65 ≈ month 24 · Lv85 ≈ month 36 · Lv100 ≈ month 48.
- Ranks: E (1–9) · D (10–24) · C (25–44) · B (45–64) · A (65–84) · S (85–99) · ELITE (100).
- Rank gates: when XP reaches a rank boundary, the level stays capped (`RANK EXAM AVAILABLE`) and XP keeps banking until the Rank Exam (§7.5) is passed.

### 5.3 Self-Trust and the Promise Ledger

- Every objective is a promise. **TRUST** = % of promises kept in the last 30 days (show 7-day too), displayed large on the Status Window. Lifetime "Promises kept" counter.
- TRUST drives difficulty (§4.3).
- Copy: "Your brain trusts evidence, not hype. Every kept promise is evidence."

### 5.4 HP, MP, Fatigue (15-second morning check-in)

- Inputs: hours slept, sleep quality 1–5, energy 1–5, mood 1–5, pain (y/n + where).
- HP from sleep; MP from energy + mood. Shown as bars.
- HP < 40 % → RECOVERY PROTOCOL: today's Body becomes mobility + walk. Calm teal notice. Still counts as kept.
- Fatigue builds on consecutive full days while HP < 60 %; at threshold → automatic deload day.
- Mood ≤ 2 on 5 of the last 7 days → Support card (§11 rule 7) and load −25 % for 3 days. Never a penalty.

### 5.5 Never miss twice

- FAILED day → tomorrow opens with a **PENALTY QUEST** (red theme, alarm tone): 20 min on his current Dragon task (§6.11), or a 30-min walk if HP is low. Must be cleared by the deadline or the day fails.
- Two FAILED days in a row → **RECOVERY MODE**: 3 days at 50 % load, no penalties. Voice: "Load reduced. Return."
- Tone: firm, never humiliating. No "you're weak", no streak guilt.

### 5.6 Quest types

- **Daily Quest** (§4) · **Main Quest** (§7.4) · **Skill Gate** (§7.1) · **Boss Raids** = real exams.
- **Hidden Quests** (Lv3+): 1–2 per week at random — e.g. ask a stranger for a recommendation, cook a new healthy meal, teach a concept to a friend, delete an app you don't need, take the free VIA Character Strengths survey on its official site and log your top 5. Bonus XP; small chance of a Title.
- **Emergency Quests** (Lv8+): about one per fortnight, time-boxed ("60 minutes: send 5 outreach messages"), big reward, never between 22:00 and wake time.
- **Gates** (after D-Rank): Saturday raid — a 2–3 h time-boxed project sprint with a Boss deliverable, rank-matched E → S. Ship at the bell.
- **Rank Exams** (§7.5).

### 5.7 Essence and the Reward Shop (Lv6+)

- Essence = XP ÷ 10. Prices are set by the System: 1 h gaming/series 150 · cheat meal 300 · movie night 400 · new book 400 · Sunday lie-in (+2 h) 500 · gym gear item 2,000. Bigger rewards unlock by rank.
- Nothing can buy out the Daily Quest or a Penalty Quest.

### 5.8 Titles (Lv8+, one equipped at a time)

| Title | Condition | Bonus |
|---|---|---|
| The One Who Wakes | 14 on-time Awakens in a row | +5 % VIT XP |
| Keeper of Promises | 30-day TRUST ≥ 90 % | +5 % all XP |
| Fear Eater | 10 Shadows | +10 % NRV XP |
| Iron Body | Daily Trio at 100/100/100 | +10 % STR XP |
| Silent Hunter | 7 days under screen-time target | +10 % FOC XP |
| Scholar | 5 Library books | +10 % WIS XP |
| Merchant | First R1,000 from the Main Quest | +10 % Main Quest XP |
| Strategist | +200 puzzle rating from baseline | +10 % SEN XP |
| The Returner | 10 re-entries within 30 min of a drift | +10 % WIL XP |
| Know Thyself | DECODED ≥ 50 % | +10 % WIS XP |

### 5.9 Job Change (Lv25)

Assigned from his data (top two stats + Easy/Hard map), never chosen: Strategist (SEN+INT), Architect (ORD+INT), Vanguard (NRV+STR), Sage (WIS+INT), Merchant (SEN+LCK), Monk (FOC+WIL). Grants a passive bonus; the System's notices start using the job name.

---

## 6. THE MIRROR — the self-knowledge engine (his #1 purpose)

### 6.1 Pulses (experience sampling)

Three a day — the morning check-in is #1, #2 after lunch, #3 at Shutdown. Energy 1–5, focus 1–5, mood 1–5, "What are you doing?" (study / work / social / phone / rest / gym / other), "Phone urge right now?" y/n. ≤ 10 seconds, big tap targets, no typing.

### 6.2 Objective feedback

After each objective, two taps: difficulty 1–5, enjoyment 1–5. Auto-record start delay (minutes from quest arrival or window start to pressing START).

### 6.3 Drift Log and Re-entry

- A big **I DRIFTED** button on the Status Window. Tag the cause: phone · overthinking · too much on my plate · tired · people · unexpected event · chose something better. Optional note.
- It immediately opens **RE-ENTRY**: the next objective + a 2-minute ignition timer. Re-entry within 30 min = small WIL bonus. Voice: "Return."
- **Declared Swap** (max 1/day): swap an objective for something of equal or greater value, declared *before* doing it → counts as kept. Undeclared deviation = drift.

### 6.4 Motivation tags

On ~1 in 3 completions: "What got you to do this?" — money · mastery · recognition · avoiding the penalty · curiosity · duty/family · health · proving myself.

### 6.5 Night Journal (3 lines, ≤ 60 s)

1. Which promise did I keep that past-me wouldn't have?
2. What did I fear today vs what actually happened?
3. One lesson.

### 6.6 Thought Audit (weekly, inside the Guild Report)

Tick which thinking traps showed up and roughly how often: catastrophising ("Murphy"), mind-reading ("they think I'm…"), all-or-nothing (perfectionism), fortune-telling, should-statements, discounting wins. Each has a one-line example and an antidote question. Trend chart over weeks.

### 6.7 Weekly Guild Report (Sunday)

- XP, level and stat changes; TRUST 7/30; completion by objective; deep-work hours; screen-time trend; drifts by cause; fear calibration; Easy/Hard changes; new insights.
- Auto-picks the **Weekly Focus Stat** (his weakest) → its objectives earn ×1.5 next week.
- **Copy for Claude** button: copies a compact plain-text report (≤ 400 words) built to paste into a Claude chat for coaching.
- **Download backup** (JSON), reminded every Sunday.

### 6.8 Murphy's Law Debugger (Fear Log) + Shadow Army

- Fear Log is available from Lv1 (Pre-Boss Rituals need it): situation · "I'm afraid that…" · probability % · severity 1–10 · if-then plan ("If ___ happens, I will ___") · check-back date.
- On check-back: what actually happened? came true / partly / didn't happen / better than expected.
- Dashboard: fears logged, % that came true, average predicted %, a predicted-vs-actual calibration chart, and the line **"You predicted disaster X times. It happened Y times."**
- Big decisions get the **Fear-Setting** template: define the worst case → how to prevent it → how to repair it → benefits of trying → cost of inaction at 6, 12 and 36 months (credit Tim Ferriss in the Codex).
- **Shadow Army (Lv2+):** every resolved fear, and every Courage quest above his comfort level, gets an **ARISE** button → it becomes a Shadow named "Shadow of [fear in ≤ 4 words]", ranked by severity, in a growing gallery — visual proof of every fear he has beaten.

### 6.9 Decision Journal (after D-Rank)

For decisions that matter: decision · expected outcome · why · confidence % · review date (1–3 months). On review: outcome, lesson. Feeds calibration (SEN, WIS).

### 6.10 Assessments (Full Awakening; retake every 6 months)

- **Big Five personality:** the IPIP 50-item Big-Five factor markers (Goldberg; public domain — verify item text and scoring keys on ipip.ori.org and credit it). Show results as low / average / high bands, not false precision. Show change between retakes.
- **Values:** card sort of ~30 values → he picks his top 5 (self-knowledge, not a design choice).
- **"Who I'm becoming":** three sentences in his own words, shown on the back of the Status Window.

### 6.11 Insights → the Player Manual

Pure functions that unlock a chapter once there's enough data. Always show the sample size; never claim causation.

| Chapter | Unlocks at | Example output |
|---|---|---|
| Energy curve | ≥ 21 Pulses over ≥ 7 days | "Energy peaks 09:00–11:00, dips 14:00–16:00." |
| Focus peak | ≥ 21 Pulses + ≥ 10 Dungeon sessions | "Your best deep work is after 21:00." → System moves the Main Quest window |
| Easy/Hard map | ≥ 30 objective ratings | 2×2: Natural Talents (easy + enjoy) · Growth Zone (hard + enjoy) · Chores (easy + dislike) · Dragons (hard + dislike) |
| Drift triggers | ≥ 10 drifts | "62 % of drifts start with the phone, mostly 14:00–16:00." |
| Motivation profile | ≥ 20 tags | "You show up most for mastery, then money." |
| Sleep → performance | ≥ 14 days | "After nights under 7 h, completion drops 31 %." (Spearman; label it "correlation, not proof") |
| Phone → focus | ≥ 14 screen-time logs | "On days over 4 h of screen time, deep work halves." |
| Start delay | ≥ 30 objectives | "You start fast on Body, slow on Courage (avg 47 min)." |
| Fear calibration | ≥ 5 resolved fears | "You predict 60 %; it happens 12 % of the time." |
| Thinking traps | ≥ 4 Thought Audits | "Top trap: mind-reading." |
| Personality | IPIP done | Bands + plain-English meaning |
| Values | Card sort done | Top 5 values |
| Signature Skills | Lv20 + ≥ 5 Skill Gates | Skills ranked by progress rate × enjoyment |

- **DECODED %** = unlocked chapters ÷ total chapters.
- The **Player Manual** page reads like a manual: *How Sfundo works* — Best hours · What drains me · What drives me · My natural talents · My dragons · The trap to watch · What I do when I drift · How to restart me. Exportable as text.
- The current **Dragon** (the hardest, least-enjoyed recurring task) is used by Penalty Quests.

### 6.12 Countermeasures for his four enemies

1. **Phone & scrolling** — no-phone windows in Awaken and Shutdown; ×1.25 Dungeon XP when the phone is in another room; nightly screen-time log (from Digital Wellbeing / Screen Time) with a target that starts at baseline −10 % and drops 10 % per week to a floor of 2 h/day; **SCROLL DEBUFF** (FOC XP −20 %) on days over target; an **Urge resisted** button (+1 WIL, logs the time for the Mirror); a Full Awakening setup quest: put ARISE in the dock spot of his most-used social app, move social apps into a folder on the last home screen, grayscale/bedtime mode after 22:00, non-essential notifications off.
2. **Overthinking before starting** — the Status Window shows ONE next objective; every timer opens with a 2-minute ignition ("Open it. Do one line."); Fear Log and Fear-Setting for big worries; the System never asks him to choose.
3. **Taking on too much, then crashing** — the Awakening Ramp; trust-gated progression; 240-min hard cap; Sunday rest; one-in-one-out commitments (§11 rule 6); automatic deloads; Recovery Mode after two misses.
4. **Drifting from the plan** — deadline-based objectives with recommended windows; I DRIFTED → instant Re-entry; declared swaps; drift data feeds the Player Manual.

---

## 7. THE FORGE — content

### 7.1 Skill Gates — one new skill a month (breadth)

- Unlock when BREAK mode starts. Each = ~20 hours over a month (40 min/day): Day 1 skill map (sub-skills) · resources · a 20-hour plan · weekly checkpoints · a **Boss Test**. Cleared → "NEW SKILL ACQUIRED: [name] Lv.1".
- Skill levels keep growing: E 0–20 h · D 20–100 h · C 100–300 h · B 300–1,000 h · A 1,000–3,000 h · S 3,000 h+ with external proof.
- **The System picks** the next skill: of the next 3 in the queue, the one that trains his weakest stat.

| # | Skill | Trains | Boss Test |
|---|---|---|---|
| 1 | Learning How to Learn (retrieval, spacing, interleaving, memory palace — upgrades SEED) | INT | Learn an unfamiliar hard concept in one day; teach it in a 5-min recording |
| 2 | Public Speaking & Storytelling | NRV | 5-min talk to a live audience of ≥ 3 |
| 3 | Negotiation | SEN | Negotiate 3 real things (price, terms, a favour); log outcomes |
| 4 | Chess: Tactics & Calculation | SEN, INT | +150 Lichess puzzle rating from baseline |
| 5 | Sales & Cold Outreach | NRV, LCK | 50 logged outreach conversations |
| 6 | Personal Finance & Investing Fundamentals (education only) | WIS | Written personal money plan |
| 7 | Persuasive Writing | INT, WIS | Publish one long-form essay |
| 8 | Cooking for Performance | VIT | 10 different healthy meals |
| 9 | Reading People & Body Language | SEN | 20 logged observation drills |
| 10 | Design Fundamentals | ORD | Redesign one MVELO client page |
| 11 | Mental Math & Estimation | INT | Timed benchmark test |
| 12 | Markets & Risk (forex basics, demo account only) | SEN, WIS | 30 demo trades journaled against a written plan — graded on process, never profit |
| 13 | First Aid | VIT, NRV | Accredited course or full practical drill |
| 14 | Video Creation | LCK | Publish a 60-second explainer |

- **Resources:** research with web search; include only links you've verified load (title, URL, why it's worth it). YouTube first; favour videos that explain the intuition rather than only working examples. Maths/stats: Professor Leonard first whenever he covers the topic.

### 7.2 Library (the System's reading order)

1. *Atomic Habits* — James Clear
2. *The Courage to Be Disliked* — Ichiro Kishimi & Fumitake Koga
3. *Make It Stick* — Brown, Roediger & McDaniel
4. *Range* — David Epstein
5. *Deep Work* — Cal Newport
6. *The Scout Mindset* — Julia Galef
7. *Peak* — Anders Ericsson & Robert Pool
8. *Meditations* — Marcus Aurelius (Gregory Hays translation)
9. *$100M Offers* — Alex Hormozi
10. *Never Split the Difference* — Chris Voss
11. *The Psychology of Money* — Morgan Housel
12. *Mastery* — Robert Greene
13. *The Almanack of Naval Ravikant* — Eric Jorgenson
14. *Thinking, Fast and Slow* — Daniel Kahneman
15. *The Luck Factor* — Richard Wiseman
16. *Influence* — Robert Cialdini
17. *The Art of War* — Sun Tzu
18. *Man's Search for Meaning* — Viktor Frankl

Log pages or minutes + a one-line takeaway. Finishing a book = bonus XP + WIS + a 2-min Teach-back on it.

### 7.3 Courage Ladder (graded exposure for fear of judgement)

- Full Awakening: he lists 10 things he avoids because of what people might think and rates each 0–100 → these become his personal rungs, merged with the defaults by rating.
- Default rungs: 1 greet 3 strangers · 2 ask a stranger for directions or a recommendation · 3 ask a question in a lecture, tutorial or meeting · 4 give a stranger a genuine compliment · 5 ask for a discount or upgrade (expect a no — the rep is the win) · 6 post a piece of your work publicly · 7 message 3 people you admire with one specific question · 8 walk into a local business and pitch MVELO in person · 9 speak in front of a group · 10 ask for something big (a mentor meeting, a high-ticket sale, an opportunity).
- Each attempt logs fear before/after (0–100). Move up a level after 5 attempts with an after-fear < 40.
- A rejection counts as a WIN. Show "Rejections collected".
- Never pranks or deception; never make anyone uncomfortable; respect every "no".
- Codex links (verify both load): Jia Jiang, "What I learned from 100 days of rejection" (TED) — https://www.youtube.com/watch?v=-vZXgApsPCQ · Tim Ferriss, "Why you should define your fears instead of your goals" (TED) — https://www.youtube.com/watch?v=5J6jAC6XxAI

### 7.4 Main Quest I — "First Blood" (Training Arc)

**Goal:** R10,000 earned through MVELO Studio from new clients by 28 Feb 2027. One chapter visible at a time:

1. **Arsenal** — one-page MVELO portfolio: the Yengwayo Designs website and the POS system as case studies, plus his existing price tiers (R1,000 · R2,500 · R5,000–10,000 · R15,000–25,000 · R30,000+).
2. **Offer** — one clear starter offer for small businesses + a one-paragraph pitch.
3. **Hunt** — 50 outreach conversations (in person, WhatsApp, email); rejections celebrated.
4. **First Contract** — first new client signed (deposit received).
5. **Deliver** — ship, collect a testimonial.
6. **R10,000** — cumulative new-client revenue in the GOLD ledger.

- **Main Quest II** is chosen at the February System Update from his data (candidates: scale MVELO, or launch Sneaker Spa on campus once the semester starts).
- **GOLD ledger:** real income (ZAR, source, date). Money milestones by rank: E first R100 from a skill · D R1,000 in a month · C R5,000/month · B R15,000/month · A R50,000/month · S R100,000/month.

### 7.5 Rank Exams

- **D-Rank (Lv10):** 25 of the last 30 Daily Quests complete · TRUST30 ≥ 80 % · DECODED ≥ 25 % · 5 Shadows · Skill Gate #1 Boss cleared · Main Quest chapter 2 cleared.
- **C-Rank (Lv25):** 3 Skill Gates cleared · 20 Shadows · Main Quest I complete · DECODED ≥ 50 % · Courage Ladder level ≥ 6 · 6 Library books.
- **B-Rank and above:** draft in the same style (real-world proof across body, mind, money, courage and self-knowledge); refine at monthly updates.

---

## 8. Screens

1. **Pre-Awakening** (Phase 3, ~3 min): name (prefilled "Sfundo"), wake and lights-out times, gym days, exams (subject + date), last exam date → EXAM mode starts.
2. **Full Awakening** (Day 0 of BREAK, ~45 min, can be split across the day): physical test (max push-ups, max squats in 2 min, max sit-ups in 2 min, plank hold, today's steps — stop at any pain) · screen-time baseline · Lichess puzzle rating · Fear Inventory (10 items) · IPIP-50 · values card sort · "Who I'm becoming" · phone setup quest (§6.12).
3. **Status Window** (home): name, level, rank, title, job, HP/MP, **TRUST %**, **DECODED %**, the 10 stats, GOLD, Essence, streak, mode; one big **NEXT OBJECTIVE** card with START; **I DRIFTED** button.
4. **Daily Quest window:** objectives with live counters (`Push-ups [12/40]`), set buttons, timers, checkboxes, recommended windows, deadline countdown.
5. **Dungeon Timer:** 2-minute ignition → focus countdown; phone-away checkbox; interruption counter; SEED prompts for study; end-of-session quality 1–5 + note.
6. **Quest Log:** main, skill, hidden, emergency, gates, penalty, boss raids.
7. **Skills:** current Skill Gate, acquired skills and levels, resources.
8. **Mirror:** Pulses, Player Manual, Easy/Hard map, insights, Thought Audit, Decision Journal, assessments.
9. **Fear Log & Shadow Army.**
10. **Library.**
11. **Shop, Titles, Inventory.**
12. **History:** XP over time, stats radar, TRUST line, deep-work hours, screen time, fear calibration.
13. **Guild Report.**
14. **Laws.**
15. **Settings:** times, gym days, mode dates, exams, sound/voice, commitments budget, export/import, calendar export, reset.

- Navigation: bottom tab bar — Status · Quest · Mirror · Skills · More.
- Locked features show a teaser card: `LOCKED — Lv.X`.
- **Level unlocks:** Lv1 Status, Daily Quest, Timer, Pulses, Journal, Fear Log, Guild Report · Lv2 Shadow Army · Lv3 Hidden Quests · Lv5 Player Manual · Lv6 Shop · Lv8 Titles + Emergency Quests · D-Rank: Gates + Decision Journal · Lv20 Signature Skills · Lv25 Job Change.
- **Mode unlocks:** Skill Gates, Courage, Strategy and the Main Quest open with BREAK mode.
- Calibrate early XP so Lv2 arrives on day 1–2 of use and Lv5 within ~10 days.

---

## 9. Look, sound, voice

- **Theme:** near-black navy background; glowing electric-blue "system windows" (1 px borders, soft outer glow, corner brackets); white text, cyan accents. PENALTY = red. RECOVERY = calm teal. Bracketed headers: `[STATUS]`, `[QUEST INFO]`, `[NOTICE]`.
- **Fonts** (Google Fonts): Rajdhani for headings and numbers, Inter for body; tabular numerals for stats.
- **Motion:** notices slide in with a brief glitch; level-up = full-screen pulse + stat-up list; Shadow extraction = particles rising. Respect `prefers-reduced-motion`.
- **Sound** (Web Audio API, synthesised at runtime — no audio files): quest chime, objective tick, level-up fanfare, penalty alarm, ARISE swell. Mute toggle.
- **Voice** (Web Speech API): key lines spoken — "Daily Quest has arrived." · "Objective complete." · "Level up." · "Penalty quest issued." · "Return." Prefer a deep English voice, rate 0.9. On by default (he learns by ear); toggle in Settings.
- **Copy voice:** terse, cold, game-like, never cruel. "Player" in notices; "Sfundo" on the Status Window.

---

## 10. Tech

- **Stack:** Vite + React + TypeScript (strict) + Tailwind CSS · Zustand (UI state) · Dexie/IndexedDB (data) · Recharts · date-fns + date-fns-tz · vite-plugin-pwa (offline, installable) · Vitest.
- No backend, no accounts, no analytics, no API keys. All data stays on the device. Call `navigator.storage.persist()`.
- **Folders:**
  - `src/engine/` — pure functions only (no React, no Dexie, no `Date.now()`; time is passed in): `xp`, `stats`, `ranks`, `trust`, `dailyQuest` (per mode + ramp), `penalties`, `vitals` (HP/MP/fatigue), `insights`, `fear`, `unlocks`, `rng` (seeded), `day` (day boundary).
  - `src/content/` — skills, library, courage, hiddenQuests, titles, shop, rankExams, mainQuests, ipip50, values, laws, updates.
  - `src/data/` — Dexie schema (versioned migrations), repositories, export/import.
  - `src/ui/` — design-system components (SystemWindow, StatBar, Counter, Notice, Timer…) and screens.
  - `src/audio/` — synth, voice.
- **Entities:** Player, StatState, DayLog, QuestInstance (+ objectives with target/progress), ObjectiveFeedback, Pulse, Drift, MotiveTag, JournalEntry, ThoughtAudit, FearEntry, Shadow, CourageRung, SkillGate, SkillLevel, DeepWorkSession, ReadingLog, GoldEntry, Decision, Assessment, Insight, ScreenTimeLog, TitleState, Purchase, WeeklyReport, Settings.
- **Tests (must pass before every commit):** XP/level/rank math and rank gates · quest generation per mode, ramp week, Sunday, gym vs non-gym day · TRUST + advance/hold/step-back · penalty → recovery transitions · day boundary (logs at 23:59, 00:30, 03:59 and 04:00 Johannesburg time) · HP/MP and recovery triggers · every insight locked below its threshold and correct above it (fixtures) · fear calibration · 4-year simulation at 85 % completion within ±15 % of the §5.2 targets.
- **Calendar:** Settings → "Add schedule to my calendar" downloads `arise-schedule.ics` (wake alarm, Main Quest window, Shutdown, Sunday Guild Report) with alarms. Web apps can't reliably schedule notifications; the phone's calendar can. If his calendar app drops imported alarms, the README explains how to turn on default reminders for that calendar.
- **Deploy:** GitHub Pages via GitHub Actions; repo `arise` under GitHub user `4445392`; Vite `base: '/arise/'`; manifest scope to match. If `gh` isn't authenticated, stop and tell him to run `gh auth login`.

---

## 11. Safety rails (override everything)

1. **Money & risk:** no gambling, betting, lottery or real-money trading quests, ever. "Calculated risk" means social and career risk with a small downside. The Markets skill is demo-only and graded on process; trading profit or loss never earns XP.
2. **Cunning ≠ manipulation:** no deception, pranks or manipulation. Strategy, negotiation, perception and honest persuasion only.
3. **Body:** progressive limits only (§4.5); a pain flag swaps exercises; rest days are mandatory; no training when ill.
4. **Food:** no calorie targets, fasting or restriction quests — only positive habits (water, protein, vegetables, cooking).
5. **Sleep:** never schedule under 7 h in bed. Lights-out is a quest.
6. **Load cap:** the Daily Quest never exceeds 240 min. Settings keeps a weekly commitments budget; adding a recurring commitment requires removing or shrinking another.
7. **Mood:** on the §5.4 trigger, show a calm Support card: talk to someone you trust; UWC student support/counselling services. Include a helpline number only if you've verified it on the official organisation's website via web search; otherwise list none. Never penalise during low-mood periods.
8. **Copy:** never shaming, never streak guilt.
9. **Privacy:** all data local; export/import only.
10. **IP:** original names, art and sound only.

---

## 12. Build phases

- **Phase 0 — Setup:** CLAUDE.md, DECISIONS.md, scaffold, git, README (run / test / deploy).
- **Phase 1 — Engine + tests** (`src/engine`), including the 4-year simulation.
- **Phase 2 — Data:** Dexie schema v1, repositories, export/import, `persist()`.
- **Phase 3 — Core UI (EXAM mode complete):** design system · Pre-Awakening · Status Window · Daily Quest · Dungeon Timer · morning check-in (HP/MP) · Pulses · Night Journal / Shutdown · I DRIFTED + Re-entry · Fear Log + Pre-Boss Ritual · Boss Raids · Laws · basic sound + voice.
- **Phase 4 — PWA + deploy:** manifest, original SVG icon → PNG sizes, offline cache, GitHub Actions → Pages. **STOP.** Report the URL and install steps — Android: Chrome → ⋮ → Add to Home screen; iPhone: Safari → Share → Add to Home Screen. Wait for `continue`.
- **Phase 5 — Systems:** Shadow Army · Hidden Quests · Penalty/Recovery UI · Guild Report + Copy for Claude + backup reminder · .ics export.
- **Phase 6 — The Mirror:** objective feedback · motive tags · insights engine UI · Player Manual + DECODED % · Easy/Hard map · Thought Audit · assessments · Decision Journal.
- **Phase 7 — The Forge:** Full Awakening · BREAK + SEMESTER modes · Awakening Ramp · Daily Trio + steps · Skill Gates + verified resources · Library · Courage Ladder · Main Quest I + GOLD ledger · Rank Exams · Titles · Shop · Jobs · Emergency Quests · Gates · in-app Teach-back recording (MediaRecorder, stored locally, auto-deleted after 30 days).
- **Phase 8 — Polish & QA:** animations · History charts · unlock teasers · accessibility · 375 px audit · Lighthouse PWA ≥ 90 · Playwright smoke tests if Playwright installs cleanly (otherwise note it in DECISIONS.md) · `.claude/commands/system-update.md` (§13) · final deploy · final report.

---

## 13. Monthly System Update (the adaptive loop)

Create `.claude/commands/system-update.md` so Sfundo can type `/system-update` once a month after putting his latest backup JSON in `exports/`. It must: read the backup → summarise trends (TRUST, completion by objective, drift causes, insights) → apply content updates within §11 (next Skill Gate resources verified by web search, new Hidden Quests, retuned targets, next Rank Exam draft; at the February update, propose Main Quest II and finalise SEMESTER mode) → run tests → commit → deploy → write 10 lines of "System Update notes" to `src/content/updates.ts`, shown on the next app open.

---

## 14. Definition of done

- Installed on his phone, works offline, data survives reloads.
- EXAM mode usable after Phase 4.
- Tests green, build passes, deployed.
- Sfundo never had to make a design decision.
