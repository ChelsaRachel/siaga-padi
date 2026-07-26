# Task 01 — Baris KPI + Daftar Kasus Prioritas + Ekspor

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-dashboard-aggregates.md`](../backend/01-dashboard-aggregates.md) — aggregate endpoints

## Goal

Halaman dashboard penyuluh: empat kartu KPI dengan penanda kesegaran & peringatan overdue, daftar kasus prioritas terfilter (klik kartu → prefilter; klik baris → review Sprint 06; kembali → filter dipertahankan), tombol ekspor dengan modal konfirmasi cakupan, dan empty state "Buat Kasus Pendampingan".

## Files to touch

- `apps/web/src/pages/dashboard/` + `parts/` — KPI row + case list + export modal
- `apps/web/src/features/dashboard/components/` — KPI card, freshness marker, priority table
- `apps/web/src/services/dashboard.ts`; `src/routes/` + `src/config/menu/` — "Dashboard" menu entry

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — KPI cards + table
- `apps/web/skills/reactjs-dynamic-filter/SKILL.md` — card→list prefilters
- `apps/web/skills/reactjs-features/SKILL.md` — placement (`features/dashboard/`)

## TODOs

- [ ] KPI cards with freshness text; stale (>15 min) shows "data lama" + reload; overdue card highlighted per threshold
- [ ] Priority list per minute; card-click prefilter; round-trip filter persistence with review detail
- [ ] Export modal states scope (wilayah binaan, no unnecessary personal data) → download via expiring link
- [ ] Empty state → "Buat Kasus Pendampingan" → Sprint 01 assisted flow + Sprint 02 wizard
- [ ] Tests: prefilter mapping, stale marker, export modal copy

## Done when

Skenario 10.1 brief 05: scan KPI → drill overdue → reschedule via review → return with filters kept; export downloads a limited table.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
