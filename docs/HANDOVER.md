# HANDOVER — Siaga Padi (Web PWA MVP)

State snapshot for picking this up in a fresh session. Updated 2026-07-21 (2nd revision).
Pair with `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` (the in-scope spec) and `CONTRIBUTING.md` (team workflow).

- Repo: `/Users/fahrialfiansyah121gmail.com/Documents/projects/siaga-padi`
- Branch: trunk is `development` (= `6e0d8c7`, all 4 PRs merged) · remote `origin` = github.com/ChelsaRachel/siaga-padi · default branch on GitHub is still `dev-chelsa` (should be switched to `development` in repo Settings).
- Goal (one line): rice pest & disease early-warning + advisory **PWA** for farmers (petani) and extension workers (penyuluh), built web-first from the Web PWA FRD.

---

## 1. Orientation (read first)

- **Everything from the bootstrap phase is MERGED.** PRs #1–#4 landed in `development`: team workflow docs, web scaffold + repo hygiene, Tani Ramah design tokens, external-deps fix + rebrand. There is no pending stack.
- **App:** `apps/web/` — React 18 + TypeScript + Rspack + Zustand + shadcn/ui, Fusion theme customised to **"Tani Ramah"** (leaf green `#1F6F4A`, rice yellow accent, warm earth; large radii; thin shadows). UI authority: `design/web/fusion/DESIGN.md` — its UX rules are binding (guided linear flow, low density, mobile bottom-nav, ≥44px touch targets, yellow is accent-only with dark text, no colour-only severity).
- **Live CSS source is `apps/web/src/styles/variable.css`** (imported via `src/index.css`). `apps/web/globals.css` is **dead code** — 496 lines never bundled, kept only as a shadcn-CLI pointer (`components.json`). Never edit it expecting visual effect.
- **Vocabulary rule (CRITICAL):** workplace-identifying words are banned from every repo artifact — branch names, commit messages, code comments, docs, PR text. Use "external", "private", "internal", "former" instead. Gate before every commit AND on the commit message:
  `git grep -iE '\boff[i]ce\b|\bkant[o]r\b' -- ':!*.lock'` (bracket-regex on purpose so the gate itself stays clean; `officer`/`EXTENSION_OFFICER` are legitimate domain terms — word boundary keeps them safe).
  Residue from before this rule exists in merged-PR history/pages (old commit `52a2005` wording, vendor CDN domain in an old file revision). **Open decision:** recreate the repo for a true purge vs accept — belongs to the user + Chelsa.
- **Scaffolding origin:** boilerplates come from a **private scaffold service reachable only on one specific network/VPN** (endpoint lives in `.claude/skills/bootstrap-project/scripts/init_boilerplate.sh`, which is gitignored). Scaffolding any new stack (`be-python`, `mobile-flutter`, `agent-python`) requires that network. The service unzips to `<project>/<out>/` (normalize into `apps/<role>/` by hand) and does NOT rewrite manifest names.
- `.claude/`, `.codex/`, `.mcp.json`, `AGENTS.md`, `CLAUDE.md` are machine-local private tooling, **gitignored** — except `.claude/skills/{git-flow,session-handover}` which are deliberately tracked and shared with the team.

## 2. Done so far (all verified)

- **4 PRs merged** into `development` (evidence: `development=6e0d8c7`; `git merge-base --is-ancestor d6f39b1 origin/development` passes).
- **Toolchain installed & proven:** fnm 1.39.0 → Node v20.20.2 (auto-switches via `.nvmrc`; hook in `~/.zshrc`), uv 0.11.30 → Python 3.12.13, repo-root `.venv/` (gitignored). System Python 3.9.6 untouched. `npm install` done (~700 pkgs).
- **Dev server verified live:** `Rspack compiled successfully in ~1.3s`, `http://localhost:8081/` → HTTP 200, `<title>Siaga Padi</title>`, zero `/cdn-assets` references, Phosphor icon fonts served from the local bundle, palette `#1F6F4A` present in served CSS. (Server may still be running in the background from the last session.)
- **Security:** npm audit cut **25 → 8 moderate** (`npm audit fix`, non-breaking). Zero critical/high. Remaining 8 need MAJOR bumps (`@rspack/cli` 2.x, `echarts` 6, `ajv` 8, `gzipper` 8) — deliberately deferred; do NOT run `npm audit fix --force` casually.
- **Design applied with numbers, not eyeballs:** WCAG AA verified per ramp (primary 6.12:1 light / 4.88:1 dark on white; tertiary 6.26:1; yellow accent 10.64:1 with dark text). Dark ramps written explicitly (naive inversion failed at 3.92:1).
- **Icons vendored:** `@phosphor-icons/web` with exactly the 5 weights `renderIcon()` supports; external-CDN proxy removed; `/api/v1/apps` proxy → `localhost:8000` placeholder.
- **Rebranded:** `index.html` (lang=id, Siaga Padi meta, theme `#1F6F4A`, pinch-zoom re-enabled per WCAG 1.4.4) + `manifest.json` (Indonesian name/description, bg `#EDF5F0`).

## 3. Environment

- macOS arm64, Homebrew at `/opt/homebrew`. Shell zsh; `~/.zshrc` has the fnm `--use-on-cd` hook.
- **Docker: NOT installed** → `supabase-init` and therefore the whole backend track are blocked until the user installs Docker Desktop.
- Port 8080 is occupied by VS Code; Rspack dev server uses `port: 'auto'` (landed on 8081 last runs).
- `grep` on this machine is **ugrep** — patterns starting with `-` (e.g. `->`) are parsed as options; quote/avoid.
- No test secrets exist yet; `env/.env*` under `apps/web/env/` are gitignored, keys need `REACT_` prefix.

## 4. Build / run / test / verify

```bash
cd apps/web
npm run dev          # Rspack dev server, auto port → verify http://localhost:<port>/ shows "Siaga Padi"
npm run build:prod   # production build — NOT yet exercised this project (unknown state, verify before relying on it)

# Tests: NONE configured yet. @testing-library/* deps exist but no runner/script.
# Add Vitest before writing tests (repo rule: 80% coverage target).
```

## 5. Conventions & gotchas

**Workflow (binding — see `CONTRIBUTING.md` + `.claude/skills/git-flow/SKILL.md`):** feature branches off latest `development` (`feat/<slug>`, `fix/<slug>`, `docs/<slug>`…), PR into `development`, review + green CI before merge, branches are **kept** after merge, Conventional Commits, **no watermark/Co-Authored-By trailers**, stage narrowly, never force-push shared branches.

**Frontend rules (from `apps/web/AI_GUIDE.md`):** Component → Zustand store → Service → API only; all HTTP in `src/services/`; `@/` imports; env via `src/types/env.ts`; filters only via `modules/dynamic-filter`; menus/routes config-driven from `src/config/menu/*`; no new npm packages without checking `package.json`.

**Traps already hit (do not repeat):**
- **Fetch before any history rewrite.** A rewrite was done here while PRs were being merged remotely → duplicated commits → add/add conflicts in 8 files. Always `git fetch` + re-check `origin/development` immediately before rebasing/rewriting anything.
- **The boilerplate shipped a LIVE Mapbox token** in `apps/web/skills/reactjs-map*` docs. It is redacted in this repo (`pk.<YOUR_MAPBOX_TOKEN>`), but the upstream boilerplate still carries it — GitHub Push Protection will block pushes if it reappears. Secret-scan every future scaffold output before committing.
- **PWA is NOT functional.** `public/sw.js` is uncompiled Workbox source; `workbox` is not in `package.json`; registration only runs in prod builds. FR-014 (offline draft queue + background sync) must be built from scratch (Workbox InjectManifest + IndexedDB).
- Icon PNGs in `apps/web/public/images/` are still boilerplate artwork — needs real Siaga Padi assets.
- Local branch **`dev-fahri` holds outdated handover docs with pre-rule vocabulary. Never push it**; safe to delete.

## 6. Next steps

1. **Resolve the open decision** (§1): repo recreation for history purge vs accept residue — user + Chelsa.
2. **Make the PWA real (FR-014):** add `workbox-*` deps + Rspack InjectManifest wiring, compile `sw.js`, IndexedDB draft queue + Background Sync, honest "queued/sent" UI per DESIGN.md rule 6.
3. **Add Vitest** (+ first tests for `utils/`, stores, services; 80% target).
4. **First FRD screens:** app shell with mobile bottom-nav (DESIGN.md UX rules 1–4), capture → triage → recommendation flow skeleton against mock services (`mock-client` pattern in AI_GUIDE).
5. **Backend track (blocked on Docker):** install Docker Desktop → `python .claude/skills/supabase-init/scripts/init.py --sandbox-root <repo-root>` → scaffold `be-python` (requires the private network) → normalize to `apps/backend/` → wire `.supabase/credentials.env`.
6. Housekeeping: set GitHub default branch → `development` + protect it; replace icon artwork; delete local `dev-fahri`; report the leaked Mapbox token upstream for rotation.

## 7. Blockers / decisions for the user

- **Repo recreate vs accept history residue** — only the user (with Chelsa) can decide; affects remote history and PR pages.
- **Docker Desktop install** — prerequisite for the entire backend/Supabase track.
- **Private-network access (VPN)** — required for scaffolding any new stack; plan scaffold work for when it's reachable.
- **Mapbox token rotation** — the leaked token belongs to an external account; report upstream.
