# Sprint 02 — Case Management

**Status:** ✅ Done
**Created At:** 2026-07-25
**Started At:** 2026-07-26
**Completed At:** 2026-07-26

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

**Completed 2026-07-26:** 5 dari 5 task ✅ Done — **119 pytest + 152 vitest hijau, tsc bersih, build prod sukses**. Migration 0010 diterapkan pada stack Supabase lokal; trigger transisi, append-only event, idempotency unik, dan RLS petani/penyuluh lulus verifikasi live. Security review dijalankan; seluruh temuan blocking diperbaiki (bentuk pagination riwayat, penanganan respons 202 antrean offline, siklus auth replay service worker) plus dua hardening (pembatasan peran create, batas koordinat) dan penutupan celah replay kunci idempotensi lintas pengguna. Kontrak FE↔BE terkunci di [`apps/web/docs/api-spec-case.md`](../../../apps/web/docs/api-spec-case.md).

**Keputusan lintas-sprint yang perlu diketahui:** status kasus disimpan memakai **15 nilai kanonik FRD §6.5** (DRAFT…CANCELLED), bukan 7 label Indonesia; label Indonesia disajikan sebagai `displayStage` turunan. Sprint 03/05/06 harus memperluas state machine di **dua tempat sekaligus**: trigger `enforce_case_transition()` di migration dan `LEGAL_TRANSITIONS` di `models/siaga_case.py`.

## Outcome

Sprint 02 menghasilkan alur manajemen kasus lengkap untuk petani dan mode pendampingan: wizard tiga langkah dengan tiga cabang lokasi dan idempotensi, profil/lahan serta permintaan penghapusan, riwayat berfilter dengan pagination, dan detail linimasa/progres. Verifikasi browser nyata membuktikan respons offline 202 tampil sebagai “Draft tersimpan di perangkat”, antrean terkirim setelah online, double-submit menghasilkan satu kasus, dan load-more bekerja melewati 10 dari 14 kasus uji.

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/01_MANAJEMEN_KASUS_PETANI.md`](../../../brief/01_MANAJEMEN_KASUS_PETANI.md)
