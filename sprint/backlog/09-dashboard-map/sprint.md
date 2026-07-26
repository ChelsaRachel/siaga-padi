# Sprint 09 — Dashboard & Peta Wilayah (Should / MVP Extended)

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Dashboard prioritas kerja harian penyuluh: baris KPI (kasus baru, perlu review, tindak lanjut overdue, tingkat tidak yakin), daftar kasus prioritas dengan ekspor terbatas, dan peta sebaran agregat per kecamatan dengan penyamaran sampel kecil — brief [`05_DASHBOARD_PETA_WILAYAH.md`](../../../brief/05_DASHBOARD_PETA_WILAYAH.md) (FR-010).

## Acceptance

- KPI per jam (cache ≤ 15 menit) + penanda kesegaran ("Diperbarui X menit lalu", basi > 15 menit → penanda + muat ulang); klik kartu → daftar terfilter.
- Daftar prioritas keselamatan per menit; drill-down ke review (Sprint 06) dan kembali dengan filter dipertahankan.
- Peta agregat: hanya angka per area, sampel kecil disamarkan, disclaimer "bukan prevalensi resmi"; peta gagal → daftar area tabular, fungsi lain tetap jalan.
- Ekspor tabel wilayah binaan tanpa data pribadi tak perlu; tautan kedaluwarsa 24 jam.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce — agregasi dihitung backend terjadwal. `be_service` + `fe_shell`.

## Cross-stack dependencies

No new schema — aggregator over Sprints 02–06 data. FE depends on the aggregate endpoints. Basemap access key managed as system secret (never raw client-side exposure beyond scoped public token policy).

## Dependency graph

```
backend/01-dashboard-aggregates.md
    ↓
    ├─ frontend/01-kpi-priority-list.md
    └─ frontend/02-area-map.md
```

## Outcome

(Filled in on archive.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/05_DASHBOARD_PETA_WILAYAH.md`](../../../brief/05_DASHBOARD_PETA_WILAYAH.md)
