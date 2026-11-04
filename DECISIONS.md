# DECISIONS

One line each: decision — reason.

## Phase 0
- Vite 8 + React 19 + Tailwind 4 (`@tailwindcss/vite`) + Vitest 5 — latest stable versions; no `tailwind.config` needed.
- Scaffolded by hand (not `create-vite`) — avoids interactive prompts.
- Package manager npm — default, already installed.
- Engine tests run in Node environment; data tests use `fake-indexeddb` — keeps the engine pure and the data layer testable.
- `gh` CLI is not installed on this machine — deploy workflow is written; Sfundo must install `gh` and run `gh auth login` (the one allowed stop).
- Fonts via @fontsource (Rajdhani + Inter, latin subset) instead of the Google Fonts CDN � same fonts, bundled so the PWA works fully offline.
