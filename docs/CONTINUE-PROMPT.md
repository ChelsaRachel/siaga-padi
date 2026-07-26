# Continuation Prompt — paste into a fresh session (remote dev server)

Copy everything in the block below as the first message to the new agent.

---

You are continuing **Siaga Padi** — a rice pest & disease early-warning + advisory **PWA** for petani and penyuluh. Sprint 01 (Auth & Roles) is fully done, verified, and merged into `development` (PR #11). Your job this session: implement **Sprint 02 (Case Management)**.

WORK DIR: this is a plain file tree rsynced from the Mac working copy — **there is no `.git` here**. You cannot branch, commit, or push from this machine. Work here, then the result gets rsynced back to the Mac, where it's reviewed and committed. Do not attempt git operations; if you need repo history, ask for it to be provided.

FIRST, read these in order (do not skip):

1. `docs/HANDOVER.md` — full state snapshot; §6 is the ordered Sprint 02 TODO, §8 explains this rsync-based workflow and its gotchas.
2. `sprint/backlog/02-case-management/sprint.md` — sprint goal, acceptance criteria, dependency graph. **This sprint is still in `backlog/`, not `active/`** — promote it first per `.claude/skills/sprint-builder/SKILL.md` Step 2.
3. `sprint/backlog/02-case-management/backend/00-schema-case.md` — the foundation task; everything else in the sprint depends on it.
4. `brief/01_MANAJEMEN_KASUS_PETANI.md` — the feature brief (FR-002, FR-009) this sprint implements.
5. `apps/backend/AI_GUIDE.md` and `apps/web/AI_GUIDE.md` — binding conventions per stack.
6. `apps/web/docs/api-spec.md` — the existing Sprint 01 FE↔BE contract, for reference on conventions (envelope, camelCase DTOs); Sprint 02 needs its own contract for case endpoints.
7. `CONTRIBUTING.md` + `.claude/skills/git-flow/SKILL.md` — git workflow (informational here — you can't run it, but code you write should be commit-ready).

KEY FACTS:

- Sprint 02 goal: petani (or penyuluh in assisted mode) creates a case via a 3-step wizard with consent + optional GPS, manages profil + lahan, and sees case history + timeline. GPS refusal must never block case creation — falls back to manual kabupaten/kecamatan or "belum tahu". Resubmission with the same idempotency key must not create duplicate cases.
- Dependency order: `backend/00-schema-case.md` (fields/cases/case_events + state machine per FRD §6.5–6.6 + anti-duplicate lock, next migration number after `0009`) → `backend/01-case-routes.md` → `frontend/{01-case-wizard, 02-profile-lahan, 03-case-history}.md`.
- Assisted-mode case creation reads the Sprint 01 assisted-session store — don't reinvent that; wire into it.
- The case status state machine must follow FRD §6.5–6.6 exactly — Sprint 03/05/06 extend it later, so get the states/transitions right now.
- **DB verification may not be possible here:** this same remote server previously had Docker socket permission denied for the working user and port 8000 occupied by another app, which blocked live migration-apply + RLS verification for Sprint 01's schema task — that had to be finished on the Mac instead. Check `docker compose version` and `docker ps` early. If Docker still isn't usable here, draft the migration SQL and models/DTOs fully, write the RLS policies, get everything else (routes, tests against a fake/mock repo, frontend) done and passing, and leave the live-apply + RLS two-user verification as the one explicitly flagged remaining step — same pattern Sprint 01 used successfully.
- Backend: `python api.py` only (never `uvicorn api:app` — CLI arg parsing at import). Tests must never import `api.py`; any new test app fixture needs `register_siaga_exception_handlers(app)` or errors lose their envelope.
- Frontend: Component → Zustand → Service → API only; `@/` imports; menus config-driven from `src/config/menu/*` — a new user-facing route needs both the route and the menu entry in the same unit of work.
- Vocabulary rule still applies: no workplace-identifying words anywhere. Before considering anything "done for handoff", run `git grep -iE '\boff[i]ce\b|\bkant[o]r\b' -- ':!*.lock'` yourself if git is available at all here, or eyeball new files for it — the Mac side will re-gate on this before commit either way.

RULES: BaseResponse envelope everywhere (backend); no `os.getenv` (use `settings.*`); no `print` (loguru); business logic in `service/`, never `router/`. Conventional Commits format for whatever commit message you leave in a handoff note, but again — don't actually run git here.

NEXT TASK: promote `sprint/backlog/02-case-management/` → `sprint/active/` and update `sprint/01-sprint-planning.md` + `changelog/sprint-planning.md` (event: Promoted), then implement `backend/00-schema-case.md` first, in full, before touching anything downstream. Confirm you've read the docs above, then proceed.

---
