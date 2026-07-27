# Continuation Prompt — paste into a fresh session (macOS laptop)

Copy everything in the block below as the first message to the new agent.

---

You are continuing **Siaga Padi** — a rice pest & disease early-warning + advisory **PWA** for petani and penyuluh. Sprint 01 (Auth & Roles) is done and merged (PR #11). **Sprint 02 (Case Management) was just implemented on the remote dev server and rsynced here** — your job: verify it on this Mac, close the one remaining task, then commit + push.

WORK DIR: `/Users/fahrialfiansyah121gmail.com/Documents/projects/siaga-padi` (git repo; remote `origin` on GitHub; trunk `development`). The rsynced Sprint 02 work is **uncommitted** — run `git status` first and review before staging. Nothing was committed on the remote side (that tree has no `.git`).

FIRST, read these in order (do not skip):

1. `docs/HANDOVER.md` — state snapshot; §4 has exact commands, §6 is your ordered TODO.
2. `sprint/active/02-case-management/sprint.md` — sprint state (4/5 tasks done).
3. `sprint/active/02-case-management/backend/00-schema-case.md` — the ONE open task; its Notes carry the exact psql steps.
4. `apps/web/docs/api-spec-case.md` — the pinned Sprint 02 FE↔BE contract (status vs displayStage, idempotency, offline 202).
5. `apps/backend/AI_GUIDE.md` + `apps/web/AI_GUIDE.md` — binding conventions.
6. `CONTRIBUTING.md` + `.claude/skills/git-flow/SKILL.md` — git workflow.

KEY FACTS:

- Sprint 02 is code-complete and test-verified: **119 pytest** (`cd apps/backend && ./venv/bin/pytest tests/`) and **152 vitest** (`cd apps/web && npm test`), `tsc --noEmit` clean, `npm run build:prod` passes. Re-run all four here before trusting anything.
- **The backend venv and `apps/web/node_modules` were removed from the remote tree before sync**, so your local ones are untouched. If `apps/backend/venv` is missing locally: `python3.12 -m venv venv && ./venv/bin/pip install -r requirements.txt && ./venv/bin/pip install pytest pytest-cov httpx`.
- **Only open item:** apply migration `apps/backend/supabase/migrations/0010_siaga_case.sql` to the local Supabase stack, then verify the state-machine trigger, the append-only `case_events` trigger, the unique idempotency key, and RLS with two users — all steps are spelled out in the task file's Notes. Docker was unavailable on the remote server, which is why this is pending (same pattern as Sprint 01's schema task).
- Status model: the DB stores the **15 canonical FRD §6.5 statuses**; the Indonesian stage labels are a derived `displayStage`. Sprint 03/05/06 must extend BOTH the SQL trigger `enforce_case_transition()` and `LEGAL_TRANSITIONS` in `models/siaga_case.py` — they are mirrors.
- A security review ran; all blocking findings are already fixed in the code you have: history pagination reads the real backend envelope (`totalElements`/`totalPages`), the wizard treats the service-worker's **HTTP 202** as "draft tersimpan" instead of a failure, and the offline queue no longer stores bearer tokens (replays are signed with a fresh token fetched from an open page; auth failures requeue instead of archiving the draft). Do not regress these.
- Known risks logged, NOT fixed (decide before Sprint 05/09 build on them): penyuluh scoping matches bare kecamatan names without a kabupaten qualifier (name collisions across regencies → cross-region visibility); case create is non-atomic across three PostgREST writes; `areaKabupaten`/`areaKecamatan` on create are client-controlled free text that influence penyuluh visibility.
- Secrets: `.env` / `.env.*` and `/.supabase/` are gitignored and must stay uncommitted. `.supabase/` was deliberately NOT synced back from the remote server.

RULES: Conventional Commits, **no watermark/Co-Authored-By trailers**, stage narrowly, never force-push shared branches. Before EVERY commit run the vocabulary gate `git grep -iE '\boff[i]ce\b|\bkant[o]r\b' -- ':!*.lock'` (must be empty). Backend: BaseResponse envelope, `settings.*` not `os.getenv`, loguru not print, logic in `service/` not `router/`, `python api.py` only (never `uvicorn api:app`), tests must never import `api.py`. Frontend: Component → Zustand → Service → API, `@/` imports, config-driven menus, no new npm packages.

NEXT TASK: work `docs/HANDOVER.md` §6 in order — review the worktree, re-run the four verification commands, bring up Supabase if it is down, apply migration 0010 + run the negative trigger tests + two-user RLS checks, E2E smoke the wizard (all three location branches incl. an offline submit showing "draft tersimpan"), riwayat filters + load-more past 10 cases, and the case timeline; then close `backend/00-schema-case.md` (TODOs → `[x]`, header → `✅ Done`, `changelog/backend.md` entry), archive the sprint per `.claude/skills/sprint-builder/SKILL.md` §5, and commit + push. Ask the user before choosing the branch/PR shape.
Verify each visible change (pytest/vitest/tsc/build, psql output for the trigger + RLS checks, a real browser pass for the E2E steps). Confirm you've read the docs above, then proceed.

---
