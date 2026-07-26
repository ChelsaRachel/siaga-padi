# Sprint 08 — Admin Config

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Admin mengelola pengguna/role/assignment dan konfigurasi terkendali (model CV, penyedia AI bahasa, ambang, versi KB, aturan keamanan) lewat alur draf → tinjau → aktif → rollback; perubahan kritis wajib persetujuan orang kedua; kesehatan & biaya penyedia terpantau — brief [`08_ADMINISTRASI_SISTEM.md`](../../../brief/08_ADMINISTRASI_SISTEM.md) (FR-013 + sisa FR-001).

## Acceptance

- Satu versi aktif per lingkup; diff draf-vs-aktif; aktivasi kritis butuh peninjau kedua; rollback satu klik dengan audit; setiap kasus mencatat versi konfigurasi yang dipakainya.
- Kunci layanan hanya di penyimpanan rahasia — nilai rahasia selalu tersamar di UI/API.
- Panel kesehatan penyedia per jam (hijau/kuning/merah) + pagu belanja (peringatan ≥80%, stop di 100% → fallback).
- Admin mengelola daftar pengguna, role, dan assignment wilayah penyuluh/reviewer.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce — modul kendali manusia; pemeriksaan kesehatan penyedia adalah pekerjaan terjadwal sistem. `be_service` + `fe_shell`.

## Cross-stack dependencies

`backend/00-schema-config.md` is the foundation. Formalizes the seeded config versions Sprints 03/05 read; KB version activation (Sprint 04 seam) now goes through second-person approval; provider health feeds Sprint 07's fallback routing.

## Dependency graph

```
backend/00-schema-config.md (foundation)
    ↓
    ├─ backend/01-config-routes-health.md
    │      ↓
    │      ├─ frontend/01-user-management.md
    │      └─ frontend/02-config-catalog-health.md
```

## Notes

- Model usang tidak boleh terpilih setelah tanggal penghentian; tidak ada akun bersama.

## Outcome

(Filled in on archive.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/08_ADMINISTRASI_SISTEM.md`](../../../brief/08_ADMINISTRASI_SISTEM.md)
