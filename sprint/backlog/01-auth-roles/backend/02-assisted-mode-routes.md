# Task 02 — Assisted Mode Routes (Mode Pendampingan)

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-auth.md`](./00-schema-auth.md) — assisted_sessions + profiles tables
- [`./01-auth-routes.md`](./01-auth-routes.md) — role guard for penyuluh-only endpoints

## Goal

Endpoint mode pendampingan: cari petani dalam lingkup binaan, buat profil minimal "hanya didampingi" bila belum ada, mulai/akhiri sesi pendampingan dengan metode consent tercatat.

## Files to touch

- `apps/backend/router/assisted.py` — search/start/end endpoints (penyuluh-only)
- `apps/backend/service/assisted.py` — scope enforcement (binaan only), minimal-profile creation, session lifecycle
- `apps/backend/dto/assisted.py` — DTOs

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — layering + envelope
- `apps/backend/skills/python-auth/SKILL.md` — acting-on-behalf pattern without privilege escalation

## TODOs

- [ ] Search petani restricted to the penyuluh's assignment areas (never global)
- [ ] Create minimal profile (`account_status='didampingi'`, consent method recorded) when petani has no account
- [ ] Start session → returns session id the FE keeps for the "atas nama" banner; end session closes it
- [ ] Every assisted action stamped actor + subject + consent + time (audit)
- [ ] Reject assisted actions for subjects outside binaan scope (403, tested)
- [ ] Unit tests for scope enforcement and session lifecycle

## Done when

Penyuluh token can search only own-area farmers, start a session with consent method, and the session row records actor/subject/consent/time; out-of-scope subject returns 403; tests green.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)
