# Sprint 06 — Review Penyuluh

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Penyuluh/domain reviewer meninjau seluruh bukti kasus, mengonfirmasi/mengoreksi dengan alasan wajib (versi manusia baru, hasil AI beku), meminta foto tambahan, mengeskalasi ke POPT, dan mencatat tindak lanjut — brief [`04_REVIEW_PENYULUH.md`](../../../brief/04_REVIEW_PENYULUH.md) (FR-008).

## Acceptance

- Antrean diurutkan alasan keselamatan (abstain, urgensi, konflik, permintaan petani) — bukan keyakinan tertinggi; filter wilayah/status/alasan/waktu.
- Keputusan tanpa alasan tidak bisa disimpan; koreksi hanya dari taksonomi resmi (di luar itu → "Lainnya/Tidak Diketahui"); hasil AI tidak pernah ditimpa.
- Kasus keyakinan rendah tidak bisa final otomatis oleh siapa pun; minta-foto → status revisi + panduan; foto baru → kembali ke antrean dengan prioritas dipertahankan.
- Petani menerima pembaruan bahasa sederhana; komentar internal tidak pernah bocor; koreksi ber-consent ternominasi otomatis ke antrean dataset (Sprint 10).

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce — human decision module; only rule-based queue ordering. `be_service` + `fe_shell`.

## Cross-stack dependencies

`backend/00-schema-review.md` is the foundation (versioned reviews, follow-ups, nomination flag). Consumes Sprint 05's frozen analysis results.

## Dependency graph

```
backend/00-schema-review.md (foundation)
    ↓
    ├─ backend/01-review-routes.md
    │      ↓
    │      ├─ frontend/01-review-queue.md
    │      └─ frontend/02-review-detail-followup.md
```

## Notes

- Target waktu review ≤ 24 jam (baseline pilot) — angka persis tetap di FRD.

## Outcome

(Filled in on archive.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/04_REVIEW_PENYULUH.md`](../../../brief/04_REVIEW_PENYULUH.md)
