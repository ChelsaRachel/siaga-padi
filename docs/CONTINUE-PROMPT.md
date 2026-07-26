# Continuation Prompt — paste into a fresh session (macOS laptop)

Copy everything in the block below as the first message to the new agent.

---

You are continuing **Siaga Padi** — a rice pest & disease early-warning + advisory **PWA** for petani and penyuluh. Your job this session: get Sprint 01 (Auth & Roles) verified end-to-end on this Mac, close its sprint docs, and commit + push.

WORK DIR: `/Users/fahrialfiansyah121gmail.com/Documents/projects/siaga-padi` (remote `origin` on GitHub; trunk `development`; working branch was `feat/offline-pwa-support` with uncommitted FR-014 changes — the worktree now ALSO contains the rsynced, uncommitted Sprint 01 implementation. Do NOT discard or overwrite anything; review `git status` first).

FIRST, read these in order (do not skip):

1. `docs/HANDOVER.md` — full state snapshot; §4 has the exact commands, §6 is your ordered TODO.
2. `sprint/active/01-auth-roles/backend/00-schema-auth.md` — the one open task; its Notes contain the completion steps.
3. `apps/backend/AI_GUIDE.md` and `apps/web/AI_GUIDE.md` — binding conventions per stack.
4. `apps/web/docs/api-spec.md` — the pinned FE↔BE contract for Sprint 01.
5. `CONTRIBUTING.md` + `.claude/skills/git-flow/SKILL.md` — git workflow.
6. `.claude/skills/sprint-builder/SKILL.md` §4–5 — sprint closure/archive procedure.

KEY FACTS:

- Sprint 01 is implemented and test-verified: backend 40 pytest green (needs `python3 -m venv venv` + `pip install -r requirements.txt` + `pytest pytest-cov httpx` first — the Linux venv was not synced), frontend 112 vitest green + `tsc` + `build:prod` (Mac `node_modules` is intact; no new packages).
- **Redis must run before the API can boot** (`brew services start redis`). Backend runs with `python api.py` (port 8020) — NEVER `uvicorn api:app`.
- The ONLY open item is `backend/00-schema-auth.md`: apply `supabase/migrations/0001…0009` in order to a local Supabase stack (Docker Desktop required — ask the user to install if missing; then `.claude/skills/supabase-init`), repoint `apps/backend/.env` (`SUPABASE_URL`, `SUPABASE_KEY`, and `JWT_SECRET` = the stack's JWT secret), run `scripts/seed_siaga_pilot.py` (SAVE the printed passwords), and verify RLS with the two-user SQL in HANDOVER §4.
- Then E2E smoke: login as each of the 4 seeded roles (distinct home + menu), lockout after 5 bad passwords (423 + retry time), assisted flow (search → start → persistent banner → end).
- Then close docs: task 00 → `✅ Done` + `changelog/backend.md` entry; archive the sprint (`mv sprint/active/01-auth-roles sprint/archive/`, update `sprint/01-sprint-planning.md`, outcome in `sprint.md`, `changelog/sprint-planning.md` Archived entry).
- A security review already ran; blocking findings are fixed in the code you have. Do not re-add the removed backdoor token in `auth/auth_bearer.py`; keep invalid-token = 401; the role guard must keep reading `role` from the DB, never from token claims.
- Secrets: `.env` / `.env.*` are gitignored and must stay uncommitted; `.env.example` files carry placeholders only.

RULES: Conventional Commits, **no watermark/Co-Authored-By trailers**, stage narrowly, branches off fresh `development`, never force-push shared branches. Before EVERY commit run the vocabulary gate `git grep -iE '\boff[i]ce\b|\bkant[o]r\b' -- ':!*.lock'` (must be empty; the banned words are workplace-identifying terms). Frontend: service layer only for HTTP, Zustand for shared state, `@/` imports, config-driven menus. Backend: BaseResponse envelope, `settings.*`, loguru, logic in service/ not router/. Tests must never import `api.py`.

NEXT TASK: work through `docs/HANDOVER.md` §6 in order (worktree review → runtimes + test suites → Docker/Supabase → migrations + seed → RLS verification → E2E smoke → sprint closure → commit/push). Ask the user before choosing the branch/PR split (FR-014 + Sprint 01 together vs separate) — that decision is theirs.
Verify each visible change (pytest/vitest/tsc/build, psql output for RLS, and a real browser login for the E2E steps). Confirm you've read the docs above, then proceed.

---
