# Sprint 05 — AI Triage & Rekomendasi

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Dari foto layak: indikasi CV 4 kelas (Sehat, Blas Daun, Hawar Daun Bakteri, Bercak Cokelat) dengan keyakinan terkalibrasi + abstain, kuesioner konteks ≤5 pertanyaan dari bank tervalidasi, dan rekomendasi terstruktur yang seluruhnya berbasis rujukan KB disetujui — tanpa dosis/merek/diagnosis final — brief [`03_TRIASE_REKOMENDASI_AI.md`](../../../brief/03_TRIASE_REKOMENDASI_AI.md) (FR-005, FR-006, FR-007).

## Acceptance

- Foto layak → maks 3 kandidat + band keyakinan (tinggi/sedang/rendah); "Tidak Yakin"/"Konflik" adalah hasil sah → kasus wajib review, kuesioner tetap berjalan.
- Kuesioner satu per layar, jawaban Ya/Tidak/Tidak Tahu, tidak pernah dipaksa; penanda urgensi tidak mengubah label.
- Setiap saran tindakan tertelusur ke rujukan; nol keluaran dosis/merek di sisi petani; rujukan kurang → "bukti tidak cukup" + wajib review.
- Dua kedalaman tampilan: kartu petani sederhana vs panel teknis penyuluh (kandidat + skor + versi model); peta sorotan bukti hanya untuk reviewer.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce — pipeline deterministik (gerbang kualitas → CV → pemilih pertanyaan → pengambil rujukan → penyusun rekomendasi → pemeriksa keamanan) dengan **satu** pemanggilan AI bahasa yang dibatasi ketat. `be_service` + `fe_shell`.

## Cross-stack dependencies

`backend/00-schema-triage.md` is the foundation for all BE pipeline tasks and FE screens. Consumes Sprint 03's photos and Sprint 04's KB retrieval. CV model itself is owned by Chelsa (CV & Dataset Owner) — integration is via a service interface with a stub/fixture until the model endpoint is provided.

## Dependency graph

```
backend/00-schema-triage.md (foundation)
    ↓
    ├─ backend/01-cv-inference.md ──▶ backend/02-questionnaire-engine.md ──▶ backend/03-recommendation-engine.md
    │                                                                             ↓
    ├─ frontend/01-analysis-results.md   ├─ frontend/02-questionnaire-ui.md   └─ frontend/03-recommendation-cards.md
```

## Notes

- Data ke penyedia AI bahasa dibatasi: hasil analisis + konteks + rujukan — tanpa nama/telepon/koordinat/foto mentah (brief 03 §5.3).
- Ambang & pemilihan penyedia dibaca dari config version seeded; formalisasi di Sprint 08. Fallback templat aturan penuh di Sprint 07 — task 03 menyiapkan seam-nya.

## Outcome

(Filled in on archive.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/03_TRIASE_REKOMENDASI_AI.md`](../../../brief/03_TRIASE_REKOMENDASI_AI.md)
