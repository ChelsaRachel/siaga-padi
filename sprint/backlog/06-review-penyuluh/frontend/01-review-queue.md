# Task 01 — Antrean Review Prioritas

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-review-routes.md`](../backend/01-review-routes.md) — queue endpoint

## Goal

Halaman antrean review untuk penyuluh/POPT: daftar kasus wilayah binaan dengan penanda alasan review (tidak yakin / konflik / urgensi / permintaan petani), umur antrean, filter, dan urutan prioritas keselamatan.

## Files to touch

- `apps/web/src/pages/review-queue/` + `parts/` — queue table/cards + filter bar
- `apps/web/src/features/review/queue/components/` — reason badges, age indicator
- `apps/web/src/services/review.ts`; `src/routes/` + `src/config/menu/` — penyuluh/reviewer menu entry

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — queue list
- `apps/web/skills/reactjs-dynamic-filter/SKILL.md` — filter bar
- `apps/web/skills/reactjs-features/SKILL.md` — placement (`features/review/`)

## TODOs

- [ ] Queue list ordered by safety priority; reason badges + queue age per row
- [ ] Filters (wilayah, status, alasan, rentang waktu); per-minute refresh
- [ ] Row click → review detail (Task 02) carrying case id; return preserves filters
- [ ] Empty state for reviewers with no pending cases
- [ ] Tests: badge mapping, filter persistence on back-navigation

## Done when

Seeded queue renders safety-priority order with correct badges; filtering and drill-down round-trip preserves filter state.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
