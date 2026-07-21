# Continuation Prompt — paste into a fresh session

Copy everything in the block below as the first message to the new agent.

---

You are continuing **Siaga Padi** — a rice pest & disease early-warning + advisory **PWA**
for farmers (petani) and extension workers (penyuluh), built web-first from the Web PWA FRD.

WORK DIR: `/Users/fahrialfiansyah121gmail.com/Documents/projects/siaga-padi`.
Trunk is `development` at `a376481`; the current working branch is
`feat/offline-pwa-support` with the FR-014 frontend implementation and refreshed handover
docs still uncommitted. Remote `origin` is on GitHub. **Do not discard, commit, push, or
rewrite these changes without reviewing the worktree and asking the user first.** GitHub's
default branch is still `dev-chelsa` and needs separate repository housekeeping.

FIRST, read these in order (do not skip):

1. `docs/HANDOVER.md` — full state snapshot, verification evidence, remaining work, blockers.
2. `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — the in-scope product specification.
3. `apps/web/AI_GUIDE.md` — binding frontend conventions.
4. `design/web/fusion/DESIGN.md` — binding "Tani Ramah" design and UX rules.
5. `CONTRIBUTING.md` — team Git workflow.

KEY FACTS:

- `apps/web/` runs with Node 20 via fnm. `npm run build:prod` now passes and produces a
  compiled `build/service-worker.js`; the main CSS build still emits two pre-existing
  `postcss-calc` warnings.
- **FR-014 frontend PWA support is implemented locally:** Workbox precaching, an opt-in
  IndexedDB mutation queue, Background Sync, seven-day retention, idempotency keys,
  bounded retries, conflict/failed persistence, worker messaging, Zustand status, and an
  honest Indonesian "menunggu terkirim" banner.
- Browser verification passed with a fresh Chrome profile: the app shell reloaded while
  the preview server was stopped, a synthetic opted-in mutation returned HTTP 202, and
  three unsuccessful replay attempts moved it to the visible failed/retry state.
- The current app only has auth/dashboard screens. No real case/photo mutation exists yet,
  so future form services must explicitly use `queueableRequest()` or
  `queueableUploadRequest()`; normal auth, reads, and destructive calls must not be queued.
- The production precache currently includes 47 assets (~21.5 MB), mostly due to existing
  bundled font/icon assets. Treat size reduction as a later performance task.
- No test runner exists yet. Add Vitest before expanding behavior; the repository target is
  80% coverage.
- Docker is not installed, so backend/Supabase work remains blocked. New stack scaffolding
  also requires access to the private scaffold service/network.
- `npm audit` reports 8 moderate findings and no high/critical findings. Available fixes
  require major upgrades; never run `npm audit fix --force` casually.
- **Vocabulary rule:** workplace-identifying words are banned in repository artifacts; use
  "external", "private", or "internal". Before committing, run:
  `git grep -iE '\boff[i]ce\b|\bkant[o]r\b' -- ':!*.lock'`.
- The upstream boilerplate previously exposed a live Mapbox token. Secret-scan any future
  scaffold output before committing; GitHub Push Protection is active.

RULES: Follow `AI_GUIDE.md` strictly (service layer only for HTTP, Zustand for shared state,
`@/` imports, `REACT_` env prefix, dynamic-filter module for all filters, config-driven
menus). Follow `CONTRIBUTING.md` (feature branches from fresh `development`, Conventional
Commits, no watermark trailers, narrow staging, keep branches after merge). Always fetch
and re-check `origin/development` before rebasing or rewriting. One open decision belongs to
the user: repository recreation versus accepting pre-rule vocabulary residue in merged-PR
history—ask before touching history.

NEXT:

1. Inspect `git status` and the FR-014 diff; do not restart or overwrite the implementation.
2. If the user approves, narrowly stage and commit the PWA + documentation slice, then ask
   separately before pushing.
3. Add Vitest and focused tests for PWA config/storage/store/service behavior.
4. Build the first FRD app shell and capture → triage → recommendation skeleton, including
   the mobile bottom navigation required by `DESIGN.md`.
5. Resume backend work only after Docker becomes available.

Report what you verified and any blockers before proceeding.

---
