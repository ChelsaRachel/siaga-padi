# Task 02 — Peta Sebaran Agregat Wilayah

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./01-kpi-priority-list.md`](./01-kpi-priority-list.md) — dashboard hosts the map panel

## Goal

Peta interaktif agregat per kecamatan (warna intensitas + label angka), legenda + disclaimer "sebaran operasional — bukan prevalensi resmi", klik area → daftar kasus area, dan fallback daftar area tabular + banner saat layanan peta gagal.

## Files to touch

- `apps/web/src/features/dashboard/components/` — map panel (via map wrapper), legend, area fallback table
- `apps/web/src/components/wrappers/` — reuse/extend the Mapbox wrapper per project rules
- public admin-boundary geojson for kecamatan aggregates

## Skills to consult

- `.claude/skills/reactjs-map/references/map-rules.md` — container & frame contract (map fills its panel; flex height chain)
- `apps/web/skills/reactjs-map/SKILL.md` — Mapbox wrapper usage
- `apps/web/skills/reactjs-features/SKILL.md` — placement

## TODOs

- [ ] Aggregate choropleth/markers per kecamatan; small-sample areas rendered as ranges (data already masked server-side) — never a farm point
- [ ] Legend + static disclaimer; hourly refresh matching KPI cache
- [ ] Area click → priority list filtered by area code
- [ ] Map-load failure → tabular area list + "peta tidak tersedia" banner; rest of dashboard unaffected
- [ ] Token via env config (never hardcoded — see repo secret-scan rule); map fills its panel per container contract
- [ ] Tests: fallback branch, area-click filter wiring

## Done when

Seeded aggregates render per-kecamatan with legend; killing the map service shows the tabular fallback while KPIs/list still work; no hardcoded token in source.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
