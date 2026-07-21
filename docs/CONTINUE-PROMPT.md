# Continuation Prompt — paste into a fresh session

Copy everything in the block below as the first message to the new agent.

---

You are continuing **Siaga Padi** — a rice pest & disease early-warning + advisory **PWA** for farmers (petani) and extension workers (penyuluh), built web-first from the Web PWA FRD.

WORK DIR: `/Users/fahrialfiansyah121gmail.com/Documents/projects/siaga-padi` (trunk = `development`, all bootstrap PRs merged; remote `origin` on GitHub; do NOT push without asking; GitHub default branch is still `dev-chelsa` — pending housekeeping).

FIRST, read these in order (do not skip):
1. `docs/HANDOVER.md` — full state snapshot (orientation, verified done, env, gotchas, next, blockers).
2. `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` — the product spec you build to.
3. `apps/web/AI_GUIDE.md` — frontend conventions you MUST follow.
4. `design/web/fusion/DESIGN.md` — binding design + UX rules ("Tani Ramah").
5. `CONTRIBUTING.md` — team git workflow (feature branches, PR to development, keep branches, no trailers).

KEY FACTS:
- `apps/web/` runs: `cd apps/web && npm run dev` (Node 20 auto-switches via fnm; Rspack picks a free port, last 8081; verify title "Siaga Padi" + HTTP 200). No test runner exists yet (add Vitest). `npm run build:prod` never exercised.
- Live CSS tokens: `apps/web/src/styles/variable.css` (WCAG-AA-verified Tani Ramah palette, light+dark). `apps/web/globals.css` is dead code — never edit it.
- **PWA is not functional yet**: `sw.js` is uncompiled Workbox source, workbox not installed — FR-014 (offline queue) is the flagship pending feature.
- Docker is NOT installed → backend/Supabase track fully blocked until the user installs it. Scaffolding new stacks needs a private network/VPN (script under `.claude/skills/bootstrap-project/`, gitignored).
- npm audit: 8 moderate remain, all needing MAJOR bumps — never `npm audit fix --force` casually.
- **Vocabulary rule:** workplace-identifying words are banned in every repo artifact; use "external/private/internal". Gate every commit + message with: `git grep -iE '\boff[i]ce\b|\bkant[o]r\b' -- ':!*.lock'` (bracket-regex keeps the gate itself clean; `officer` domain terms are fine).
- Local branch `dev-fahri` contains outdated docs with pre-rule vocabulary — never push it.
- The upstream boilerplate leaks a live Mapbox token — secret-scan any future scaffold output before committing (GitHub Push Protection is active and will block).

RULES: Follow AI_GUIDE strictly (service layer only for HTTP, Zustand for shared state, `@/` imports, `REACT_` env prefix, dynamic-filter module for all filters, config-driven menus). Follow CONTRIBUTING (feature branch off fresh `development`, Conventional Commits, no watermark trailers, narrow staging, keep branches after merge). Always `git fetch` and re-check `origin/development` before any rebase/rewrite. One open decision belongs to the user: repo recreation vs accepting pre-rule vocabulary residue in merged-PR history — ask before touching history.

NEXT TASK: build **FR-014 offline PWA support**: add workbox deps + Rspack InjectManifest wiring so `sw.js` actually compiles and registers, then an IndexedDB draft queue with Background Sync and honest "menunggu terkirim" UI per DESIGN.md rule 6. Then the broader sequence in HANDOVER §6 (Vitest → first FRD screens with bottom-nav shell → backend once Docker exists).
Verify each visible change (`npm run dev` → check the served page; for the SW, verify registration in a production build/preview). Confirm you've read the docs above, then proceed.

---
