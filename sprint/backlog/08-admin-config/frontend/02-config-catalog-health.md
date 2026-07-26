# Task 02 — Katalog Konfigurasi + Panel Kesehatan & Biaya

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-config-routes-health.md`](../backend/01-config-routes-health.md) — config + health endpoints

## Goal

Halaman "Konfigurasi": tabel versi per lingkup (status, pemilik), nilai rahasia tersamar, tampilan diff draf-vs-aktif, tombol Setujui/Aktifkan/Rollback (gerbang orang kedua tampak jelas), dan panel kesehatan penyedia + pagu belanja (indikator hijau/kuning/merah, peringatan 80%).

## Files to touch

- `apps/web/src/pages/config-catalog/` + `parts/`
- `apps/web/src/features/admin/config/components/` — catalog table, diff view, approval bar, provider health cards, budget meter
- `apps/web/src/services/config.ts`; `src/routes/` + `src/config/menu/` — admin menu entry

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — catalog + diff presentation
- `apps/web/skills/reactjs-features/SKILL.md` — placement
- `apps/web/skills/reactjs-error-handling/SKILL.md` — activation failure / gate messaging

## TODOs

- [ ] Catalog per scope with one-active indicator; secrets always masked
- [ ] Diff view draf vs aktif; critical scopes show second-approver requirement state
- [ ] Approve/activate/rollback actions with confirmations; emergency rollback labeled + post-incident note prompt
- [ ] Provider health cards (per-hour refresh) + budget meter with 80%/100% states; drill-down per provider
- [ ] Tests: mask rendering, gate messaging, health/budget states

## Done when

Skenario 10.1 brief 08 jalan end-to-end di UI: draf ambang v8 → diff → persetujuan orang kedua → aktif → rollback tersedia; panel kesehatan menampilkan status penyedia seeded dengan benar.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
