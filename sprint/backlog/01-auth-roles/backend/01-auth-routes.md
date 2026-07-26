# Task 01 — Auth Routes: Login, Session, Lockout, /me

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-auth.md`](./00-schema-auth.md) — profiles/lockout tables must exist

## Goal

Endpoint auth yang membungkus Supabase-issued JWT: login, refresh, `/me` (role + assignment), dan kunci akun sementara setelah 5 kegagalan dalam 15 menit — dengan pesan yang tidak membocorkan keberadaan akun.

## Files to touch

- `apps/backend/router/siaga_auth.py` — login/refresh/me endpoints (register in `api.py`)
- `apps/backend/service/siaga_auth.py` — lockout window logic, audit entries
- `apps/backend/dto/siaga_auth.py` — request/response DTOs (camelCase)
- `apps/backend/middleware/` — role guard dependency (petani/penyuluh/admin/domain_reviewer)

## Skills to consult

- `apps/backend/skills/python-auth/SKILL.md` — boilerplate auth flow to extend, JWT verification
- `apps/backend/skills/python-api-design/SKILL.md` — router/service/dto layering + response envelope
- `apps/backend/skills/python-logging/SKILL.md` — audit log conventions

## TODOs

- [ ] Login endpoint delegating credential check to Supabase auth, returning session + profile
- [ ] Lockout: 5 failures / 15 min window → temporary lock with retry-after; identical error body whether or not the account exists
- [ ] `/me` returns role, display name, assignment areas — the FE shell contract
- [ ] Role-guard dependency usable as `Depends(require_role(...))` by later sprints
- [ ] Audit entries for login success/failure/lockout (no passwords, no tokens in logs)
- [ ] Unit tests: lockout window, role guard allow/deny, envelope shape (≥80% on new service code)

## Done when

Valid credentials → 200 + session + camelCase profile; 5 bad attempts within 15 min → locked response with clear retry time; `/me` with a penyuluh token includes assignment kecamatan list; tests green.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)
