# Task 01 — Case Routes: Create, List, Detail, Timeline, Profile/Lahan

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-case.md`](./00-schema-case.md) — case/field tables + transition table

## Goal

Endpoint kasus & profil: buat kasus idempoten (wizard), daftar + filter riwayat, detail + linimasa, kelola profil/lahan, permintaan penghapusan data — semua patuh RLS dan mode pendampingan.

## Files to touch

- `apps/backend/router/cases.py`, `apps/backend/service/cases.py`, `apps/backend/dto/cases.py`
- `apps/backend/router/farmer_profile.py`, `apps/backend/service/farmer_profile.py` — profil + lahan CRUD + deletion request

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — layering, envelope, pagination
- `apps/backend/skills/python-auth/SKILL.md` — ownership + assisted context

## TODOs

- [ ] `POST /cases` with `Idempotency-Key`: replay returns the same case, never a duplicate
- [ ] Create validates minimum fields (owner, field-or-area, phase, observed_at) and sets status `draf`
- [ ] Assisted create: actor from session, owner = subject petani; recorded on the case
- [ ] `GET /cases` (filter lahan/status/date, paginated) + `GET /cases/{id}` + `GET /cases/{id}/timeline` (from `case_events`)
- [ ] Profile endpoints: update own profile, CRUD lahan, submit deletion request (recorded, not immediate wipe — retention policy per FRD)
- [ ] Unit tests: idempotent replay, assisted ownership, filter correctness

## Done when

Replaying the same create payload+key returns the same `caseCode`; timeline lists the draf-creation event; petani cannot fetch another owner's case (404/403); tests green.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)
