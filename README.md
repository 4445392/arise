# ARISE

A personal System: daily quests that look pointless and compound into power. Mobile-first PWA, all data stays on your device (no backend, no accounts, no analytics).

Full design: [ARISE_SPEC.md](ARISE_SPEC.md) · Judgement calls: [DECISIONS.md](DECISIONS.md)

## Run

```bash
npm install
npm run dev        # http://localhost:5173/arise/
```

## Test and build

```bash
npm test           # engine + data tests (Vitest)
npm run build      # typecheck + production build -> dist/
npm run preview    # serve the production build
```

Icons are generated from `public/icon.svg`: `node scripts/make-icons.mjs`.

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to Pages.

One-time setup:

```bash
gh auth login
gh repo create arise --public --source . --push
gh api -X POST repos/4445392/arise/pages -f build_type=workflow   # or: repo Settings -> Pages -> Source: GitHub Actions
```

The app lives at `https://4445392.github.io/arise/`.

## Install on your phone

- **Android:** open the link in Chrome -> ⋮ -> **Add to Home screen** (or **Install app**).
- **iPhone:** open the link in Safari -> Share -> **Add to Home Screen**.

After the first load it works offline. Your data lives in the browser's storage on that device, so:
**download a backup every Sunday** (More -> Settings -> Export). Clearing site data or uninstalling the app erases it.

## Calendar reminders (Phase 5)

Settings -> "Add schedule to my calendar" downloads `arise-schedule.ics`. If your calendar app drops the imported alarms, turn on default reminders for that calendar in its settings.
