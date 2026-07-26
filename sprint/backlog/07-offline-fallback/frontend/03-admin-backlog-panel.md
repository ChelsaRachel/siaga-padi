# Task 03 — Panel Backlog & Kesehatan Sistem (Admin)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/03-backlog-metrics.md`](../backend/03-backlog-metrics.md) — aggregates endpoint

## Goal

Halaman "Kesehatan Sistem" untuk admin: kartu backlog & error (antrean tertunda agregat, tingkat kegagalan, layanan terganggu) dengan indikator hijau/kuning/merah, refresh per menit.

## Files to touch

- `apps/web/src/pages/system-health/` + `parts/`
- `apps/web/src/features/admin/system-health/components/` — status cards + table
- `apps/web/src/services/systemHealth.ts`; `src/routes/` + `src/config/menu/` — admin menu entry

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — status cards
- `apps/web/skills/reactjs-features/SKILL.md` — placement

## TODOs

- [ ] Status cards with threshold colors + aggregate table; per-minute refresh with stale marker
- [ ] Admin-only route guard; menu entry
- [ ] Tests: color mapping, refresh behavior

## Done when

Seeded metrics render correct colors and counts; non-admin roles cannot access the route.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
