# Task 01 — Katalog Sumber (Admin)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/02-kb-governance-routes.md`](../backend/02-kb-governance-routes.md) — catalog endpoints

## Goal

Halaman "Basis Pengetahuan" untuk admin: tabel sumber (penerbit, tanggal, lisensi, status, terakhir ditinjau) dengan filter, form pendaftaran sumber bertahap (identitas + lisensi + kategori), dan drill-down ke daftar potongan per sumber.

## Files to touch

- `apps/web/src/pages/kb-catalog/` + `parts/` — table + registration form
- `apps/web/src/features/knowledge/catalog/components/` — source row, license form, status badges
- `apps/web/src/services/kb.ts`; `src/routes/` + `src/config/menu/` — admin menu entry

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — table + filter
- `apps/web/skills/reactjs-form/SKILL.md` — stepped registration form
- `apps/web/skills/reactjs-features/SKILL.md` — placement (`features/knowledge/`)

## TODOs

- [ ] Catalog table with filters (status/penerbit); license note visible per source
- [ ] Registration form triggers ingest; success shows chunk count pending review
- [ ] Row click → chunk list for that source (feeds Task 02)
- [ ] Availability/retired status surfaced with clear labels
- [ ] Component tests: form validation, filter behavior

## Done when

Admin registers a source with license metadata, sees it in the filtered catalog, and can open its chunk list showing pending-review items.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
