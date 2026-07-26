# Task 01 — Dashboard Aggregates, Masking, Export

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../../06-review-penyuluh/backend/00-schema-review.md`](../../06-review-penyuluh/backend/00-schema-review.md) — follow-up/overdue data

## Goal

Endpoint agregat dashboard per wilayah binaan: KPI (cache ≤ 15 menit + waktu refresh), daftar kasus prioritas per menit, agregat area untuk peta (penyamaran sampel kecil), threshold tenggat (≤1 hari → warning; lewat → naik atas), dan ekspor tabel terbatas dengan tautan kedaluwarsa 24 jam.

## Files to touch

- `apps/backend/router/dashboard.py`, `apps/backend/service/dashboard.py`, `apps/backend/dto/dashboard.py`
- `apps/backend/service/export.py` — limited-column export file + short-lived signed link

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — aggregate endpoints + caching
- `apps/backend/skills/python-auth/SKILL.md` — assignment-scoped data

## TODOs

- [ ] KPI counts (baru/perlu review/overdue/tidak yakin) scoped to assignment; cached ≤15 min with `refreshedAt`
- [ ] Priority case list reusing Sprint 06 safety ordering + filters; due-date threshold flags per brief 05 §8.1
- [ ] Area aggregates: counts per kecamatan only; small-sample areas returned as ranges/masked; no farmer points for unauthorized roles
- [ ] Export: filtered table, minimum personal data, 24h-expiring signed URL; audit each export
- [ ] Unit tests: masking rule, cache freshness field, overdue flagging, export column allowlist

## Done when

Seeded data returns correct KPIs with freshness; small-sample kecamatan is masked; export link works then expires; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
