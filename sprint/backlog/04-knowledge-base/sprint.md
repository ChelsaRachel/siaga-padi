# Sprint 04 — Knowledge Base Governance

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Admin mendaftarkan sumber resmi (BB Padi, Balai POPT, IRRI), sistem memecah jadi potongan rujukan berpenanda stabil, domain reviewer menyetujui per potongan (dengan penanda kebijakan untuk konten dosis/merek), dan uji pengambilan memverifikasi indeks — brief [`06_TATA_KELOLA_PENGETAHUAN.md`](../../../brief/06_TATA_KELOLA_PENGETAHUAN.md) (FR-011).

## Acceptance

- Sumber terdaftar → potongan dihasilkan → hanya potongan **disetujui + belum kedaluwarsa** masuk indeks aktif; draf tidak pernah bocor.
- Setiap potongan punya penanda stabil (mis. `RUJ-BLAS-004`), versi, lokasi halaman/bagian; perubahan membuat versi baru, tidak menimpa.
- Potongan bermuatan dosis/merek wajib penanda kebijakan "tidak untuk dinarasikan".
- Uji pengambilan: kombinasi penyakit/fase mengembalikan potongan yang tepat sebelum versi diaktifkan.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce; kurasi manual MVP (tanpa crawler). `be_service` (ingest/index/governance), `fe_shell` (katalog + review + uji).

## Cross-stack dependencies

`backend/00-schema-kb.md` is the foundation. The retrieval index contract feeds Sprint 05's recommendation engine — that is the reason this sprint precedes triage. KB version activation approval (orang kedua) formalizes in Sprint 08; until then activation is admin-only with audit.

## Dependency graph

```
backend/00-schema-kb.md (foundation)
    ↓
    ├─ backend/01-kb-ingest-retrieval.md
    ├─ backend/02-kb-governance-routes.md
    │      ↓
    │      ├─ frontend/01-source-catalog.md
    │      └─ frontend/02-chunk-review-retrieval.md
```

## Notes

- Catat lisensi/izin pakai per sumber (konsolidasi data eksternal, brief 00 § Konsolidasi).

## Outcome

(Filled in on archive.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/06_TATA_KELOLA_PENGETAHUAN.md`](../../../brief/06_TATA_KELOLA_PENGETAHUAN.md)
