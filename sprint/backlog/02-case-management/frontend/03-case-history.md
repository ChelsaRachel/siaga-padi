# Task 03 — Riwayat Kasus & Linimasa + Layar Progres

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-case-routes.md`](../backend/01-case-routes.md) — list/detail/timeline endpoints

## Goal

Riwayat kasus (galeri kartu, filter lahan/waktu/status) dan halaman kasus dengan linimasa kronologis (dibuat → foto → hasil → review → selesai). Kasus yang masih diproses menampilkan progres bertahap bernama — bukan spinner tanpa batas.

## Files to touch

- `apps/web/src/pages/case-history/` + `parts/` — filterable card list
- `apps/web/src/pages/case-detail/` + `parts/` — timeline + staged-progress view (hosts Sprint 05 result cards later)
- `apps/web/src/features/case/history/components/` — case card, timeline item, staged progress
- `apps/web/src/routes/` + `src/config/menu/` — routes + "Riwayat" menu entry

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — list + timeline patterns
- `apps/web/skills/reactjs-dynamic-filter/SKILL.md` — filter bar
- `apps/web/skills/reactjs-features/SKILL.md` — placement

## TODOs

- [ ] History list with filters (lahan, rentang waktu, status); accepts preset filter from profile/lahan page
- [ ] Case detail: chronological timeline from `case_events`
- [ ] Staged progress ("Foto diterima ✓ → Analisis gambar → Pertanyaan lanjutan → Rekomendasi") driven by case status; refreshed on open
- [ ] Result-card slot placeholder marked for Sprint 05; "hubungi penyuluh" button stub
- [ ] Component tests: filter behavior, staged progress per status

## Done when

Petani filters history per lahan and opens a case to a correct timeline; a `diproses` case shows named stages instead of a spinner.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)
