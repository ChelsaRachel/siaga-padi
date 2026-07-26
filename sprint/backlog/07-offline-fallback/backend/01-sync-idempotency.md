# Task 01 — Sync Endpoints: Idempotency + Conflict Contract

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../../02-case-management/backend/01-case-routes.md`](../../02-case-management/backend/01-case-routes.md) — case idempotency
- [`../../03-photo-quality/backend/01-upload-quality-gate.md`](../../03-photo-quality/backend/01-upload-quality-gate.md) — photo fingerprint dedup

## Goal

Menjamin seluruh endpoint tulis yang dipakai antrean sinkronisasi (kasus, foto, jawaban kuesioner) idempoten dan mengembalikan respons konflik terstruktur (409 + payload penyebab) yang bisa disimpan utuh oleh klien.

## Files to touch

- `apps/backend/service/cases.py`, `apps/backend/service/photos.py`, `apps/backend/service/questionnaire.py` — audit & complete idempotency coverage
- `apps/backend/exceptions/` + `apps/backend/middleware/` — structured conflict response shape (machine-readable reason + server state snapshot)

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — error/conflict envelope
- `apps/backend/skills/python-logging/SKILL.md` — sync failure logging

## TODOs

- [ ] Verify/extend idempotency on all queue-consumed writes (same key replay → same result, no duplicates)
- [ ] Conflict response: 409 with reason + current server state so the client can store "catatan konflik" intact
- [ ] Stale-draft handling: submissions older than 7-day local expiry policy get explicit rejection reason
- [ ] Tests: replay per endpoint, conflict payload shape

## Done when

Replaying each queued write type produces no duplicates; a conflicting update returns a structured 409 the FE can persist for review; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
