# Task 02 — Assisted Mode Routes (Mode Pendampingan)

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
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

- [x] Search petani restricted to the penyuluh's assignment areas (never global)
- [x] Create minimal profile (`account_status='didampingi'`, consent method recorded) when petani has no account
- [x] Start session → returns session id the FE keeps for the "atas nama" banner; end session closes it
- [x] Every assisted action stamped actor + subject + consent + time (audit)
- [x] Reject assisted actions for subjects outside binaan scope (403, tested)
- [x] Unit tests for scope enforcement and session lifecycle

## Done when

Penyuluh token can search only own-area farmers, start a session with consent method, and the session row records actor/subject/consent/time; out-of-scope subject returns 403; tests green.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed.** `POST /assisted/{search,start,end}` di `router/assisted.py`, semuanya `Depends(require_role("penyuluh"))`. Scope enforcement di service (assignment kosong → hasil kosong, tidak pernah global); `subjectProfileId` XOR `newProfile` → 400; subjek di luar binaan (termasuk subjek tak dikenal, anti-enumerasi) → 403; profil minimal `account_status='didampingi'`, `user_id=NULL`. Baris `assisted_sessions` = audit stamp (actor + subject + consent + waktu). Verifikasi: unit test lifecycle start→end, double-end 400, end oleh non-owner 403; coverage `service/assisted.py` 83%.

**Tracked:** `search` yang mengembalikan `[]` untuk penyuluh tanpa baris assignment tidak bisa dibedakan dari "tidak ada hasil" — alur buat-profil-minimal akan berujung 403 tanpa diagnosa (temuan review X2); pertimbangkan pesan khusus "belum ada wilayah binaan" di sprint berikutnya.
