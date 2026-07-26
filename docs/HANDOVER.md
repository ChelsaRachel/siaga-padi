# HANDOVER — Siaga Padi (Web PWA MVP)

State snapshot for picking this up in a fresh session. Updated 2026-07-26 (5th revision — Sprint 01 fully verified, merged into `development`; next up is Sprint 02, Case Management).
Pair with `docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md` (the in-scope spec), `CONTRIBUTING.md` (team workflow), and `sprint/01-sprint-planning.md` (sprint tracking).

- Repo: `/Users/fahrialfiansyah121gmail.com/Documents/projects/siaga-padi` (on the Mac) — also being worked from a remote Linux dev server (`fahri@10.12.1.194`) via one-directional `rsync` (see §8, no `.git` on that side).
- Branch: trunk is `development` — **PR #11 (`feat/sprint-01-auth-roles`) is merged** (merge commit `c3e0e6c`). The local Mac checkout is still sitting on the now-merged `feat/sprint-01-auth-roles` branch — first thing next session: `git checkout development && git pull && git branch -d feat/sprint-01-auth-roles`, then branch fresh off `development` for Sprint 02.
- Goal (one line): rice pest & disease early-warning + advisory **PWA** for farmers (petani) and extension workers (penyuluh), built web-first from the Web PWA FRD.

---

## 1. Orientation (read first)

- **Sprint 01 (Auth & Roles) is 100% done, verified, and merged.** All 6 tasks `✅ Done`, sprint moved to `sprint/archive/01-auth-roles/`. FR-014 (offline PWA) rode in the same PR, also merged.
- **Apps:** `apps/web/` — React 18 + TS + Rspack + Zustand + shadcn/ui, "Tani Ramah" Fusion theme (`design/web/fusion/DESIGN.md` is binding). `apps/backend/` — FastAPI boilerplate (see `apps/backend/AI_GUIDE.md`; envelope `BaseResponse`, router/service/dto layering, `python api.py` only).
- **FE↔BE contract for Sprint 01 is pinned in `apps/web/docs/api-spec.md`** — endpoint paths, camelCase DTOs, envelope, 401/423 lockout semantics. It's implemented exactly on both sides; Sprint 02 will need its own contract doc for case endpoints.
- **Live CSS source is `apps/web/src/styles/variable.css`**; `apps/web/globals.css` is dead code (shadcn-CLI pointer only).
- **Vocabulary rule (CRITICAL):** workplace-identifying words are banned from every repo artifact. Gate before every commit AND on the commit message:
  `git grep -iE '\boff[i]ce\b|\bkant[o]r\b' -- ':!*.lock'` (verified clean 2026-07-26).
- `.claude/`, `.agents/`, `.mcp.json`, `AGENTS.md`, `CLAUDE.md` are machine-local private tooling, gitignored — except `.claude/skills/{git-flow,session-handover}` which are tracked.

## 2. Done so far

### Bootstrap + FR-014 + Sprint 01 (merged 2026-07-26, PR #11)
- 5 earlier PRs merged into `development`; toolchain proven (fnm → Node 20, uv → Py 3.12 for repo tooling); Tani Ramah tokens WCAG-verified; icons vendored; rebrand done.
- FR-014 offline PWA: Workbox worker via two-step Rspack + `injectManifest`, opt-in mutation queue (`queueableRequest()`), status banner. Vitest configured with PWA/offline-draft/api.service suites.
- **Sprint 01 — Auth & Roles**, verified live on 2026-07-26 on this Mac (after being drafted on the remote dev server and rsynced in):
  - **Backend:** migration `apps/backend/supabase/migrations/0009_siaga_auth.sql` (siaga_profiles, penyuluh_assignments, assisted_sessions, login_lockouts + RLS); `POST /siaga/auth/login` (5-fail/15-min lockout → 423 + retryAfter; identical 401 bodies), `POST /siaga/auth/refresh`, `GET /siaga/auth/me`; `require_role()` DB-backed guard; `POST /assisted/{search,start,end}` scoped to wilayah binaan; seed script `apps/backend/scripts/seed_siaga_pilot.py`. **40 pytest green.**
  - **Frontend:** login page, Bearer-token auth store + refresh queue, session-expired dialog, role-based shell (4 role menus, bottom-nav mobile), assisted-mode UI + persistent "atas nama" banner. **112 vitest green, `tsc --noEmit` clean, `npm run build:prod` passes.**
  - **Migration applied + RLS verified live** against a local self-hosted Supabase stack: petani sees only their own `siaga_profiles` row; penyuluh sees only rows in their assigned kecamatan (Ciparay, Baleendah) — no cross-role leakage.
  - **E2E smoke passed in a real browser** (Chrome DevTools MCP): all 4 seeded roles log in with distinct home + menu; 5th bad password triggers lockout (423, "Coba lagi dalam 15 menit", `login_lockouts.failed_count=5`); full assisted flow (search → start with `lisan` consent → banner persists across pages → end) recorded correctly in `assisted_sessions` (actor, subject, consent_method, started_at/ended_at all correct).
  - **Security review findings all fixed:** hardcoded backdoor JWT removed; invalid token → 401 (not 403); guard errors render the top-level envelope; `RateLimitMiddleware` registered (300/60s); OTP seed + change-token secret moved to settings.
  - Sprint archived at `sprint/archive/01-auth-roles/`; `sprint/01-sprint-planning.md`, `changelog/backend.md`, `changelog/web.md`, `changelog/sprint-planning.md` all updated.

## 3. Environment (Mac — current, working)

- macOS arm64, Homebrew `/opt/homebrew`, zsh with fnm hook; Docker Desktop **installed and running** (was missing in earlier revisions — now confirmed working).
- **Redis running** via `brew services start redis` (127.0.0.1:6379, no password) — already installed, service is up.
- **Backend venv exists** at `apps/backend/venv` (Python **3.12**, via `python3.12 -m venv venv`; the system default `python3` is 3.9.6, too old). `.gitignore` now correctly excludes plain `venv/` (previously only `.venv/` was listed, twice — fixed 2026-07-26).
- **Local self-hosted Supabase stack is up** at `.supabase/docker` (12 containers, all healthy). Credentials in `.supabase/credentials.env` (gitignored). **Known gotcha:** this stack's Postgres data directory was found corrupted once (`pg_attrdef` catalog, "unexpected data beyond EOF") — recovered via `python .claude/skills/supabase-init/scripts/teardown.py --wipe --sandbox-root "$(pwd)"` then re-`init.py`. If migrations start throwing baffling catalog errors again, wipe-and-reinit is the fix (no real data is at risk pre-pilot — everything is synthetic).
- **`supabase-init` script quirks:** the skill's scripts default `--sandbox-root` to a path relative to their own location (`.claude/skills/supabase-init/scripts/`), which resolves to `.claude/.supabase` — **wrong**. Always pass `--sandbox-root "$(pwd)"` explicitly from the project root. Also, `init.py`'s health-check probe can time out/exit non-zero even when the stack is actually healthy (false failure) — verify with `docker compose ps` (all rows `Up ... (healthy)`) and recover credentials with `print_env.py`, don't assume failure.
- **5 pilot accounts seeded** (admin, penyuluh, domain_reviewer, 2× petani) — passwords in `.supabase/pilot-credentials.txt` (gitignored, generated once by `seed_siaga_pilot.py`, never hardcoded in source).
- `apps/web/node_modules` intact; no new npm packages needed.
- Secrets: root `.gitignore` ignores `.env` / `.env.*` and `/.supabase/` globally. `apps/backend/.env` is already correctly pointed at the local stack (`SUPABASE_URL=http://127.0.0.1:8000`, service_role key, `JWT_SECRET` matching the stack secret) — no changes needed for Sprint 02 unless the stack gets wiped and secrets rotate (rare; `docker/.env` secrets persist across `--wipe`, only volumes are dropped).

## 4. Build / run / test / verify

```bash
# Backend
cd apps/backend
./venv/bin/pytest tests/            # expect: 40 passed (will grow with Sprint 02)
python api.py                       # port 8020 — NEVER `uvicorn api:app`

# Frontend
cd apps/web
npm test -- --run                   # vitest — expect: 112 passed (will grow)
npx tsc --noEmit
npm run build:prod
npm run dev                         # dev proxy /api/v1/apps/* → localhost:8020 (proxy.config.json)

# Supabase (already up — only needed if the stack was stopped/wiped)
python .claude/skills/supabase-init/scripts/init.py --sandbox-root "$(pwd)"   # from project root
# if it hangs/exits non-zero on the health probe but containers show healthy in `docker compose ps`:
python .claude/skills/supabase-init/scripts/print_env.py --sandbox-root "$(pwd)"

# New migrations (Sprint 02 will add 0010_case_management.sql or similar)
docker cp apps/backend/supabase/migrations/00XX_*.sql supabase-db:/tmp/migrate.sql
docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/migrate.sql
```

RLS two-user verification pattern (psql, wrap in one `-c` string or explicit `begin`/`commit` — `SET LOCAL` resets between separate `-c` invocations otherwise):

```bash
docker exec supabase-db psql -U postgres -c "begin; set local role authenticated; set local request.jwt.claims = '{\"user_id\":\"<uuid>\"}'; select ...; commit;"
```

## 5. Conventions & gotchas

**Workflow (binding — `CONTRIBUTING.md` + `.claude/skills/git-flow/SKILL.md`):** feature branches off latest `development`, PR into `development`, Conventional Commits, **no watermark/Co-Authored-By trailers**, narrow staging, keep branches after merge, never force-push shared branches. Always `git fetch` + re-check `origin/development` before any rebase/rewrite.

**Frontend rules (`apps/web/AI_GUIDE.md`):** Component → Zustand → Service → API only; `@/` imports; env via `src/types/env.ts` (`REACT_` prefix); menus config-driven from `src/config/menu/*`; no new npm packages without checking `package.json`.

**Backend rules (`apps/backend/AI_GUIDE.md`):** BaseResponse envelope everywhere; no `os.getenv` (use `settings.*`); no `print` (loguru); business logic in service/, never router/; `python api.py` only.

**Traps already hit (do not repeat):**
- Tests must never import `api.py` (CLI-arg parse at import). Any new test app fixture must call `register_siaga_exception_handlers(app)` or guard errors lose their envelope.
- Do not re-add the removed backdoor-token short-circuit in `auth/auth_bearer.py`; keep invalid-token = 401.
- The role guard reads `role` from the DB — never "optimize" it to read the token claim (refresh tokens carry stale roles for up to 7 days).
- PWA queuing is opt-in (`queueableRequest()`); do not queue auth/reads/destructive calls.
- `psql -c "SET LOCAL ..."` as a separate invocation from the following `-c "SELECT ..."` silently loses the setting — combine into one `-c` string (implicit transaction) or wrap in explicit `begin`/`commit`.
- `supabase-init` scripts' default `--sandbox-root` is wrong when the skill lives under `.claude/skills/` — always pass `--sandbox-root "$(pwd)"`.
- Local branch `dev-fahri` holds pre-rule vocabulary — never push it; safe to delete.
- Icon PNGs in `apps/web/public/images/` are still boilerplate artwork.

## 6. Next steps — Sprint 02: Case Management

Sprint 02 is currently in **backlog** (`sprint/backlog/02-case-management/`), not yet promoted to `active/`. Goal (from `brief/01_MANAJEMEN_KASUS_PETANI.md`, FR-002/FR-009): 3-step case wizard with consent + optional location, profile/lahan management, case history + timeline.

1. **Sync first:** `git checkout development && git pull` (picks up merged PR #11), delete the now-stale local `feat/sprint-01-auth-roles` branch, branch fresh off `development` for Sprint 02 (e.g. `feat/sprint-02-case-management`).
2. **Promote the sprint:** `sprint/backlog/02-case-management/` → `sprint/active/` per `.claude/skills/sprint-builder/SKILL.md` Step 2; update `sprint/01-sprint-planning.md` (Status → 🚧, Started At → today) and `changelog/sprint-planning.md` (event: Promoted).
3. **Foundation first:** `backend/00-schema-case.md` (fields/cases/case_events + state machine per FRD §6.5–6.6 + anti-duplicate lock, migration `0010_*.sql`) — everything else in the sprint depends on it.
4. **If working on the remote Linux dev server:** that box previously had `Docker socket permission-denied` for user `fahri` (not in the `docker` group) and port 8000 was occupied by another app — this blocked live migration-apply + RLS verification for Sprint 01's schema task and had to be finished back on this Mac. Check whether that's been fixed before assuming the remote can do DB verification; otherwise plan to draft the migration remotely and verify it here, same pattern as Sprint 01.
5. Then: `backend/01-case-routes.md` → `frontend/{01-case-wizard, 02-profile-lahan, 03-case-history}.md`.
6. Same closure procedure as Sprint 01 when done (task TODOs → `[x]`, changelog entries, archive, planning table update).

## 7. Blockers / decisions for the user

- **Remote-server Docker access** — unresolved as of last check; relevant again for Sprint 02's schema task if worked there (see §6.4).
- Standing items from earlier revisions: repo recreate vs accept history residue; GitHub default branch → `development` (still `dev-chelsa`); Mapbox token rotation upstream; replace icon artwork.

## 8. Remote dev-server workflow (rsync, no git)

Work has been done by rsyncing this repo to `fahri@10.12.1.194:/home/fahri/siaga-padi` (a box with an active Claude Code account) and rsyncing the result back — this is how Sprint 01 was originally drafted. Known shape of that flow:

- The rsync excludes `.git` — the remote copy is a **plain file tree, not a git repo**. No branch/commit/push is possible there; work happens uncommitted and only becomes real git history once rsynced back here and committed on the Mac.
- **Check the exclude list before every rsync.** The backend venv is named plain `venv` (see §3), not `.venv` — a command that only excludes `.venv` will copy the whole ~240 MB virtualenv both directions for nothing. Add `--exclude='venv'` (or `--exclude='apps/backend/venv'`).
- **`.supabase/` is not typically excluded either**, and it contains live secrets (`credentials.env`, `pilot-credentials.txt`) plus the Postgres Docker volume data. Decide deliberately whether that should ever leave this Mac — the remote server's own Supabase access is a separate, currently-broken story (§6.4), so the local stack's secrets have no reason to travel with it. Recommend adding `--exclude='.supabase'`.
- `apps/web/build/` and `apps/web/node_modules/` are large and reproducible — worth excluding too if not already.
- When work comes back from the remote via rsync, treat it the same way Sprint 01's code was treated this session: `git status` first, review before staging, don't assume the remote's stated "done" claims without re-running the test suites and any DB verification locally.
