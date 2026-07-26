# Sprint 10 — Dataset Feedback (Should / MVP Extended)

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Koreksi review ber-consent menjadi kandidat dataset melalui de-identifikasi, deteksi duplikat, dan kurasi manusia (setujui/tolak/label ulang/sengketa + adjudikasi), lalu rilis dataset berversi dengan manifes terkunci — brief [`07_UMPAN_BALIK_DATASET.md`](../../../brief/07_UMPAN_BALIK_DATASET.md) (FR-012).

## Acceptance

- Tanpa consent riset → gambar tidak pernah masuk antrean (hanya umpan balik agregat).
- Kandidat ter-de-identifikasi (tanpa identitas/telepon/koordinat persis); kelompok lahan/perangkat/tanggal dipertahankan dalam bentuk samaran.
- Duplikat terdeteksi → panel banding → tolak/varian; label diperdebatkan → keluar dari calon rilis sampai adjudikasi peninjau kedua/ketiga.
- Rilis bermanifes terkunci (sumber, distribusi kelas, lisensi, pengecualian); pencabutan consent menarik aset + tercatat sebagai pengecualian rilis berikutnya; tidak ada pelatihan otomatis.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce — de-identifikasi & deteksi duplikat adalah pekerjaan terjadwal sistem; keputusan tetap manusia (Chelsa + domain reviewer). `be_service` + `fe_shell`.

## Cross-stack dependencies

`backend/00-schema-dataset.md` is the foundation. Consumes Sprint 06's `dataset_nominated` flags and Sprint 01's consent fields.

## Dependency graph

```
backend/00-schema-dataset.md (foundation)
    ↓
    ├─ backend/01-dataset-pipeline-routes.md
    │      ↓
    │      ├─ frontend/01-candidate-review.md
    │      └─ frontend/02-release-builder.md
```

## Outcome

(Filled in on archive.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/07_UMPAN_BALIK_DATASET.md`](../../../brief/07_UMPAN_BALIK_DATASET.md)
