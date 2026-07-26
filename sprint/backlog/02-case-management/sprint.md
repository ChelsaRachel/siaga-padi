# Sprint 02 — Case Management

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Petani (atau penyuluh mode pendampingan) membuat kasus lewat wizard 3 langkah dengan consent dan lokasi opsional, mengelola profil + lahan, dan melihat riwayat kasus + linimasa — brief [`01_MANAJEMEN_KASUS_PETANI.md`](../../../brief/01_MANAJEMEN_KASUS_PETANI.md) (FR-002, FR-009).

## Acceptance

- Wizard 3 langkah menghasilkan kasus DRAF terikat petani + lahan + fase + waktu observasi, lalu mengarah ke alur foto (Sprint 03).
- GPS ditolak → form area kabupaten/kecamatan manual; "belum tahu" tetap menghasilkan kasus; pembuatan kasus tidak pernah terblokir oleh lokasi.
- Kiriman ulang dengan kunci anti-duplikat sama tidak membuat kasus ganda.
- Petani hanya melihat kasus miliknya (termasuk yang dibuatkan assisted); riwayat bisa difilter lahan/waktu/status; linimasa menampilkan transisi status.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce. `be_service` (case CRUD + state machine), `fe_shell` (wizard, profil, riwayat).

## Cross-stack dependencies

`backend/00-schema-case.md` is the foundation (farmers/fields/cases + state machine + idempotency). Case routes and all FE tasks depend on it. Sprint 03/05/06 will extend this state machine — transitions must follow FRD §6.5–6.6 strictly.

## Dependency graph

```
backend/00-schema-case.md (foundation)
    ↓
    ├─ backend/01-case-routes.md
    │      ↓
    │      ├─ frontend/01-case-wizard.md
    │      ├─ frontend/02-profile-lahan.md
    │      └─ frontend/03-case-history.md
```

## Notes

- Layar "Hasil Kasus" penuh (kartu rekomendasi petani) dibangun di Sprint 05 saat datanya ada; sprint ini menyediakan linimasa + layar progres bertahap.
- Assisted creation membaca store sesi pendampingan dari Sprint 01.

## Outcome

(Filled in when the sprint moves to `archive/`.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/01_MANAJEMEN_KASUS_PETANI.md`](../../../brief/01_MANAJEMEN_KASUS_PETANI.md)
