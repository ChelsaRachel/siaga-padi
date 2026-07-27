# Task 03 — Riwayat Kasus & Linimasa + Layar Progres

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
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

- [x] History list with filters (lahan, rentang waktu, status); accepts preset filter from profile/lahan page
- [x] Case detail: chronological timeline from `case_events`
- [x] Staged progress ("Foto diterima ✓ → Analisis gambar → Pertanyaan lanjutan → Rekomendasi") driven by case status; refreshed on open
- [x] Result-card slot placeholder marked for Sprint 05; "hubungi penyuluh" button stub
- [x] Component tests: filter behavior, staged progress per status

## Done when

Petani filters history per lahan and opens a case to a correct timeline; a `diproses` case shows named stages instead of a spinner.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed.** `/riwayat` (`src/pages/case-history/` + `config/case-history.filter-map.ts`) dan `/kasus/:caseId` (`src/pages/case-detail/` + hook + parts), komponen domain di `src/features/case/history/` (CaseCard, TimelineItem, CaseTimeline, StagedProgress, util `staged-progress.ts`). Progres bertahap mengikuti tabel di kontrak persis — tahap bernama dengan status ✓/berjalan/menunggu, `FAILED` diberi catatan jujur "sedang diproses ulang", **tidak pernah spinner tanpa keterangan**. Slot kartu hasil ditandai Sprint 05 + tombol "Hubungi Penyuluh" masih stub. Verifikasi: test filter chip → parameter service, preset `?fieldId=`, urutan linimasa (event pembuatan pertama), progres per status; bagian dari 152 vitest, tsc + build prod lulus.

**Keputusan modul filter:** memakai `modules/dynamic-filter` sesuai kewajiban skill (`case-history.filter-map.ts` lebih dulu, `useUrlFilters()` untuk preset `?fieldId=`), dengan komponen **ChipGroup** baru ditambahkan **di dalam** modul (diizinkan oleh `filter-rules.md` § "Adding a new filter component" karena tidak satu pun dari 18 komponen bawaan menyediakan strip chip ≥44px) dan didaftarkan di `skills/reactjs-dynamic-filter/SKILL.md`. `modules/data-display` **tidak** dipakai: FindDTO-nya mengirim `{page, size}` datar sedangkan kontrak mewajibkan `{page, limit, filters:{…}}`, dan pembaca paginationnya mengharap kunci berbeda — daftar load-more di store mengikuti pola loading/error/empty dari skill data-display.

**Perbaikan penting hasil security review — pagination:** store riwayat membaca `{currentPage, totalPage, totalItem}` padahal backend mengirim envelope boilerplate `{size, totalElements, totalPages, scrollId}`. Akibatnya `totalPage` selalu 1 dan **tombol "Muat lebih banyak" tidak pernah muncul** — petani dengan lebih dari 10 kasus tidak bisa melihat sisanya, dan hitungan kasus jatuh ke panjang halaman. Tipe `SiagaPagination` juga menutupi drift ini di compile time. Sekarang tipe + store memakai kunci nyata, fixture test diperbaiki, dan ada test load-more 25 kasus/3 halaman yang membuktikan halaman kedua benar-benar termuat.
