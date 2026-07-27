# Task 01 — Case Creation Wizard (3 Langkah)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-case-routes.md`](../backend/01-case-routes.md) — idempotent create endpoint + DTOs

## Goal

Wizard maks 3 langkah dengan tombol besar: (1) petani/lahan + panel tujuan data, (2) lokasi (GPS opsional → fallback area manual → "belum tahu") + fase, (3) konfirmasi + consent → kasus DRAF → arahkan ke alur foto (route Sprint 03, placeholder dulu).

## Files to touch

- `apps/web/src/pages/case-create/` + `parts/` — wizard steps, progress indicator (1/3…3/3)
- `apps/web/src/features/case/create/components/` — step forms, GPS-permission branch, consent panel
- `apps/web/src/services/cases.ts` — create client generating an idempotency key per wizard session
- `apps/web/src/routes/` + `src/config/menu/` — route + "Periksa Tanaman" entry (menu wired same unit of work)

## Skills to consult

- `apps/web/skills/reactjs-form/SKILL.md` — multi-step form pattern
- `apps/web/skills/reactjs-features/SKILL.md` — domain placement (`features/case/`)
- `apps/web/skills/reactjs-responsive/SKILL.md` — field-use mobile ergonomics
- `apps/web/skills/reactjs-error-handling/SKILL.md` — submit failure without losing input

## TODOs

- [x] Step 1: pick existing lahan or "buat baru" (free-name); assisted mode reads subject from Sprint 01 store
- [x] Step 2: request GPS permission; denied → kabupaten→kecamatan picker; "belum tahu" allowed; banner "GPS opsional"
- [x] Step 3: summary card (pemilik, lahan, fase, consent) + submit with idempotency key kept until success
- [x] Success → navigate to photo flow route carrying case id (placeholder page until Sprint 03)
- [x] Failed submit keeps all input; retry reuses the same key
- [x] Component tests: GPS-denied branch, idempotency-key reuse on retry

## Done when

All three branches (GPS granted / denied→manual area / belum tahu) produce a DRAF case and land on the photo placeholder with the case id; double-submit creates one case.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed.** Wizard di `src/pages/case-create/` + domain `src/features/case/create/` (store Zustand, skema yup per langkah, `useGeolocation` tap-only, `useCreateCase`, komponen langkah). Service `src/services/cases.service.ts` (mengikuti konvensi `{module}.service.ts`, bukan `cases.ts` seperti teks task). Route `/periksa-tanaman` + `/kasus/:caseId/foto` (placeholder Sprint 03 menampilkan caseCode) terdaftar; menu petani sudah menunjuk ke sana sejak Sprint 01. Ketiga cabang lokasi (GPS diizinkan / ditolak→area manual / belum tahu) diuji. Kunci idempotensi dibuat sekali per sesi wizard, dipakai ulang saat retry, diganti hanya setelah sukses. Verifikasi: **152 vitest hijau, tsc bersih, build prod sukses**.

**Batasan mode pendampingan (terdokumentasi):** endpoint `fields/get-all` mengembalikan lahan **milik pemanggil**, bukan milik subjek; jadi saat mode pendampingan aktif wizard menyembunyikan daftar lahan dan hanya menawarkan "buat lahan baru untuk {subjek}" (pemilik = subjek via `assistedSessionId`). Bila Sprint mendatang perlu memilih lahan subjek, kontrak harus menambah parameter subjek.

**Perbaikan penting hasil security review — jalur offline (FR-014):** respons **HTTP 202** dari service worker (`data.queued === true`) sebelumnya diperlakukan sebagai kegagalan. Akibatnya petani yang submit saat offline melihat "kasus belum terkirim" padahal draf sudah tersimpan dan akan dikirim otomatis; bila ia lalu mengedit dan submit ulang dengan kunci yang sama, replay idempoten membuang hasil editnya secara diam-diam. Sekarang: 202 → status jujur "Draft tersimpan di perangkat" di level halaman (`isQueuedNoticeVisible` di store, karena queueing mereset wizard ke langkah 1 sehingga notice di dalam langkah akan ikut hilang) + kunci baru dibuat agar edit-lalu-submit tidak menabrak draf yang sudah masuk antrean. Diuji di `CaseCreatePage.test.tsx`.
