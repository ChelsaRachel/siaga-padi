# HANDOVER — Siaga Padi (Web PWA MVP)

State snapshot for picking this up in a fresh session. Updated 2026-07-26 (4th revision — adds Sprint 01 Auth & Roles, implemented on the remote dev server and synced back via rsync).
Pair with `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` (the in-scope spec), `CONTRIBUTING.md` (team workflow), and `sprint/01-sprint-planning.md` (sprint tracking).

- Repo: `/Users/fahrialfiansyah121gmail.com/Documents/projects/siaga-padi`
- Branch: trunk is `development` (= `a376481`, PRs #1–#5 merged) · working branch was `feat/offline-pwa-support` with uncommitted FR-014 changes · remote `origin` = github.com/ChelsaRachel/siaga-padi · default branch on GitHub is still `dev-chelsa` (housekeeping pending). **Run `git status` first — the worktree now also contains the rsynced Sprint 01 changes on top of FR-014.**
- Goal (one line): rice pest & disease early-warning + advisory **PWA** for farmers (petani) and extension workers (penyuluh), built web-first from the Web PWA FRD.

---

## 1. Orientation (read first)

- **Everything from the bootstrap phase is MERGED** (PRs #1–#5 in `development`). FR-014 (offline PWA) is implemented locally, uncommitted. **Sprint 01 (Auth & Roles) is now implemented** across `apps/backend` + `apps/web` — done on a remote Linux dev server and rsynced into this worktree; it has never been committed anywhere.
- **Apps:** `apps/web/` — React 18 + TS + Rspack + Zustand + shadcn/ui, "Tani Ramah" Fusion theme (`design/web/fusion/DESIGN.md` is binding). `apps/backend/` — FastAPI boilerplate (see `apps/backend/AI_GUIDE.md`; envelope `BaseResponse`, router/service/dto layering, `python api.py` only).
- **FE↔BE contract for Sprint 01 is pinned in `apps/web/docs/api-spec.md`** — endpoint paths, camelCase DTOs, envelope, 401/423 lockout semantics. Both sides implement it exactly; change it only deliberately, in both stacks.
- **Live CSS source is `apps/web/src/styles/variable.css`**; `apps/web/globals.css` is dead code (shadcn-CLI pointer only).
- **Vocabulary rule (CRITICAL):** workplace-identifying words are banned from every repo artifact. Gate before every commit AND on the commit message:
  `git grep -iE '\boff[i]ce\b|\bkant[o]r\b' -- ':!*.lock'` (verified clean over the full tree on 2026-07-26).
- **Scaffolding origin:** boilerplates come from a private scaffold service (VPN-only); `apps/backend` is already scaffolded — no network needed for Sprint 01 work.
- `.claude/`, `.agents/`, `.mcp.json`, `AGENTS.md`, `CLAUDE.md` are machine-local private tooling, gitignored — except `.claude/skills/{git-flow,session-handover}` which are tracked.

## 2. Done so far

### Bootstrap + FR-014 (unchanged from 3rd revision)
- 5 PRs merged into `development`; toolchain proven (fnm → Node 20, uv → Py 3.12 for repo tooling); Tani Ramah tokens WCAG-verified; icons vendored; rebrand done.
- FR-014 offline PWA slice implemented locally on `feat/offline-pwa-support` (Workbox worker via two-step Rspack + `injectManifest`, opt-in mutation queue, status banner). Browser-verified; uncommitted.
- Vitest is now configured (`apps/web/vitest.config.ts`) with suites for PWA/offline-draft/api.service — the old "no test runner" note is obsolete.

### Sprint 01 — Auth & Roles (2026-07-26, verified on the dev server)
- **Backend:** migration `apps/backend/supabase/migrations/0009_siaga_auth.sql` (siaga_profiles, penyuluh_assignments, assisted_sessions, login_lockouts + RLS); `POST /siaga/auth/login` (5-fail/15-min lockout → 423 + retryAfter; identical 401 bodies — no account-existence leak), `POST /siaga/auth/refresh`, `GET /siaga/auth/me`; `require_role()` DB-backed guard; `POST /assisted/{search,start,end}` scoped to wilayah binaan; seed script `apps/backend/scripts/seed_siaga_pilot.py`. Evidence: **40 pytest green, coverage 83–89% on new modules** (`./venv/bin/pytest tests/`), real `python api.py` boot verified.
- **Frontend:** login page (RHF+Yup, mobile-first), Bearer-token auth store + refresh queue, draft-preserving session-expired dialog, role-based shell (4 role menus in `src/config/menu/siaga.menu.ts`, bottom-nav mobile), assisted-mode UI (`src/features/penyuluh/assisted/` + persistent "atas nama" banner). Evidence: **112 vitest green, `tsc --noEmit` clean, `npm run build:prod` passes.**
- **Security review done; all blocking findings fixed:** hardcoded backdoor JWT removed from `auth/auth_bearer.py`; invalid token now 401 (not 403); guard errors render the top-level envelope via `register_siaga_exception_handlers` (in `api.py` + `tests/conftest.py`); `RateLimitMiddleware` registered (`RATE_LIMIT=300/60s`); hardcoded OTP seed + change-token secret moved to settings (`OTP_TOTP_SEED`, `JWT_CHANGE_SECRET` in `.env`); FE refresh-queue retry-storm fix; `isSessionExpired` persisted; login redirect sanitized. Non-blocking findings are tracked in the sprint task files' Notes.
- **Sprint docs synced:** 5/6 tasks `✅ Done`; `sprint/active/01-auth-roles/backend/00-schema-auth.md` is `🚧 In Progress` — code complete, but live migration apply + RLS two-user verification **requires a running Supabase stack** (impossible on the dev server: no Docker access). Changelogs (`changelog/{backend,web}.md`) updated.

## 3. Environment

- macOS arm64, Homebrew `/opt/homebrew`, zsh with fnm hook; port 8080 occupied by VS Code (Rspack auto-ports); `grep` is ugrep — quote patterns starting with `-`.
- **Docker: NOT installed as of the 3rd revision** → installing Docker Desktop is the prerequisite for the Supabase stack (and therefore closing Sprint 01).
- **Backend runtime is NOT set up on the Mac yet:** needs Python **3.10+** venv at `apps/backend/venv` + `pip install -r requirements.txt` (+ `pytest pytest-cov httpx` for tests). The server-side venv was Linux-only and was intentionally NOT synced.
- **Redis is required before the API can even boot** (`dto/auth.py` connects at import; rate limiter uses it): `brew install redis && brew services start redis` (127.0.0.1:6379, no password).
- `apps/web/node_modules` was intentionally removed from the server before sync — the Mac's own `node_modules` is untouched and no new npm packages were added; `npm install` is only a safety re-check.
- Secrets: root `.gitignore` ignores `.env` / `.env.*` globally — `apps/backend/.env` (contains generated `OTP_TOTP_SEED`, `JWT_CHANGE_SECRET`, `RATE_LIMIT`) and `apps/web/env/.env*` must never be committed. `.env.example` files carry placeholders only.
- `apps/backend/.env` still points `SUPABASE_URL` at the old dev-server address — must be repointed to the local stack (step 4 below).

## 4. Build / run / test / verify

```bash
# Backend (first time on the Mac)
cd apps/backend
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
./venv/bin/pip install pytest pytest-cov httpx
./venv/bin/pytest tests/            # expect: 40 passed
python api.py                       # port 8020 — NEVER `uvicorn api:app` (api.py parses CLI args at import)

# Frontend
cd apps/web
npm install                         # safety re-check; no new deps were added
npm test                            # vitest — expect: 112 passed
npx tsc --noEmit
npm run build:prod
npm run dev                         # dev proxy /api/v1/apps/* → localhost:8020 (proxy.config.json)

# Supabase (after Docker Desktop is installed)
python .claude/skills/supabase-init/scripts/init.py --sandbox-root "$(pwd)"   # emits credentials.env
# then update apps/backend/.env: SUPABASE_URL, SUPABASE_KEY (service key), and JWT_SECRET
# (JWT_SECRET MUST equal the stack's JWT secret — RLS reads request.jwt.claims)
# apply migrations IN ORDER on a fresh DB:
for f in apps/backend/supabase/migrations/00*.sql; do psql "$SUPABASE_DB_URL" -f "$f"; done
cd apps/backend && ./venv/bin/python scripts/seed_siaga_pilot.py   # SAVE the printed passwords
```

RLS two-user verification (closes task 00), in psql:

```sql
set local role authenticated;
set local request.jwt.claims = '{"user_id":"<petani-user-id-from-seed>"}';
select id, display_name from siaga_profiles;   -- expect: exactly the petani's own row
set local request.jwt.claims = '{"user_id":"<penyuluh-user-id>"}';
select id, display_name from siaga_profiles;   -- expect: only rows in the penyuluh's kecamatan
```

## 5. Conventions & gotchas

**Workflow (binding — `CONTRIBUTING.md` + `.claude/skills/git-flow/SKILL.md`):** feature branches off latest `development`, PR into `development`, Conventional Commits, **no watermark/Co-Authored-By trailers**, narrow staging, keep branches after merge, never force-push shared branches. Always `git fetch` + re-check `origin/development` before any rebase/rewrite.

**Frontend rules (`apps/web/AI_GUIDE.md`):** Component → Zustand → Service → API only; `@/` imports; env via `src/types/env.ts` (`REACT_` prefix); menus config-driven from `src/config/menu/*`; no new npm packages without checking `package.json`.

**Backend rules (`apps/backend/AI_GUIDE.md`):** BaseResponse envelope everywhere; no `os.getenv` (use `settings.*`); no `print` (loguru); business logic in service/, never router/; `python api.py` only.

**Traps already hit (do not repeat):**
- Tests must never import `api.py` (CLI-arg parse at import). Any new test app fixture must call `register_siaga_exception_handlers(app)` or guard errors lose their envelope.
- Do not re-add the removed backdoor-token short-circuit in `auth/auth_bearer.py` when merging boilerplate updates; keep invalid-token = 401.
- The role guard reads `role` from the DB — never "optimize" it to read the token claim (refresh tokens carry stale roles for up to 7 days).
- PWA queuing is opt-in (`queueableRequest()`); do not queue auth/reads/destructive calls.
- Workbox + Rspack needs the two-step build (dedicated sw config + `injectManifest` script).
- The upstream boilerplate leaked a live Mapbox token once — secret-scan any future scaffold output; GitHub Push Protection is active.
- Local branch `dev-fahri` holds pre-rule vocabulary — never push it; safe to delete.
- Icon PNGs in `apps/web/public/images/` are still boilerplate artwork.

## 6. Next steps (ordered — this is the execution TODO)

1. **Review the worktree:** `git status` + `git diff --stat` — expect FR-014 (older) + Sprint 01 (rsynced 2026-07-26) together, all uncommitted. Do not discard anything.
2. **Runtimes:** Redis via brew; backend venv + deps (§4); `./venv/bin/pytest tests/` → 40 green; `cd apps/web && npm test` → 112 green, `npx tsc --noEmit`, `npm run build:prod`.
3. **Docker Desktop** (user installs) → bring up Supabase via `supabase-init` → repoint `apps/backend/.env` (`SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET` = stack secret).
4. **DB:** apply migrations 0001→0009 in order; run `scripts/seed_siaga_pilot.py`; save the printed pilot passwords somewhere safe (they are NOT stored anywhere else).
5. **Verify RLS two-user** (§4 SQL) — this is the "done when" of `sprint/active/01-auth-roles/backend/00-schema-auth.md`.
6. **E2E smoke:** `python api.py` + `npm run dev` → login as each of the 4 seeded roles (distinct home + menu), trigger lockout (5 bad passwords → 423 with retry time), run the assisted flow (search → start → banner on every page → end), check the `assisted_sessions` row.
7. **Close Sprint 01 docs** per `.claude/skills/sprint-builder/SKILL.md` §4–5: task 00 TODOs → `[x]`, header → `✅ Done`, append `changelog/backend.md` entry; then `mv sprint/active/01-auth-roles sprint/archive/`, update `sprint/01-sprint-planning.md` (status `✅ Done`, `Completed At`, link → `./archive/`), add outcome paragraph to `sprint.md`, append `changelog/sprint-planning.md` (event: Archived).
8. **Commit + push** (user said to proceed): run the vocabulary gate first; stage narrowly; Conventional Commits without trailers; suggested slicing — `feat: offline PWA support (FR-014)` then `feat: sprint 01 auth & roles (BE+FE)` then `docs: sprint 01 closure + handover` — on `feat/offline-pwa-support` or a fresh branch off `development` (user's call, see §7).
9. Then continue the backlog: Sprint 02 — Case Management (`sprint/backlog/02-case-management/`).

## 7. Blockers / decisions for the user

- **Docker Desktop install** — gates steps 3–7.
- **Branch/PR strategy** — one PR carrying FR-014 + Sprint 01 together on `feat/offline-pwa-support`, or split into separate branches/PRs? (Sprint 01 code is independent of the PWA slice except both touch `apps/web/src/services/`.)
- **Pilot account passwords** — printed once by the seed script; decide where to store them.
- Standing items from the 3rd revision: repo recreate vs accept history residue; GitHub default branch → `development`; Mapbox token rotation upstream; replace icon artwork.
