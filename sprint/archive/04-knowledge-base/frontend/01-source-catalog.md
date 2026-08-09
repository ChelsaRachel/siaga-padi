# Task 01 — Katalog Sumber (Admin)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
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

- [x] Catalog table with filters (status/penerbit); license note visible per source
- [x] Registration form triggers ingest; success shows chunk count pending review
- [x] Row click → chunk list for that source (feeds Task 02)
- [x] Availability/retired status surfaced with clear labels
- [x] Component tests: form validation, filter behavior

## Done when

Admin registers a source with license metadata, sees it in the filtered catalog, and can open its chunk list showing pending-review items.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)

- 2026-08-08 — Halaman `/pengetahuan` (`pages/kb-catalog/`) + `features/knowledge/catalog/` (tabel sumber dengan lisensi & tally menunggu-review, filter status/penerbit, form pendaftaran bertahap identitas → lisensi → kategori & dokumen, dialog pensiun di `parts/`). Registrasi menerima teks tempel (ikut request) atau berkas PDF/teks (ingest menyusul), lalu menampilkan jumlah potongan yang menunggu review + tautan ke antrean. Baris sumber → `/pengetahuan/review?sourceId=…`. Menu config-driven: `Basis Pengetahuan` ditambahkan ke `ADMIN_MENU` dan `DOMAIN_REVIEWER_MENU` (`config/menu/siaga.menu.ts`); rute menggantikan placeholder ComingSoon. Kontrak dipin di `apps/web/docs/api-spec-kb.md`, tipe di `types/siaga-kb.d.ts`, service `services/kb.service.ts` (deviasi nama terdokumentasi: `.service.ts`). Tes: validasi form 4 kasus + perilaku filter/role 3 kasus.
