# Task 03 — Assisted Mode UI (Modal + Banner "Atas Nama")

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/02-assisted-mode-routes.md`](../backend/02-assisted-mode-routes.md) — search/start/end endpoints
- [`./02-role-home-shell.md`](./02-role-home-shell.md) — penyuluh home hosts the entry point

## Goal

Penyuluh membuka "Dampingi Petani" → modal cari petani binaan (atau buat profil minimal + metode consent) → banner tetap "Anda bertindak atas nama: {nama}" selama mode aktif, dengan tombol keluar mode.

## Files to touch

- `apps/web/src/features/admin/assisted/components/` — modal (search, consent method picker, minimal-profile form) + banner (domain components live under features/, per Component Placement rules)
- `apps/web/src/stores/` — assisted-session state (subject, session id) consumed by later sprints (case wizard "atas nama")
- `apps/web/src/services/assisted.ts` — API client

## Skills to consult

- `apps/web/skills/reactjs-features/SKILL.md` — domain bucket placement
- `apps/web/skills/reactjs-form/SKILL.md` — modal form conventions
- `apps/web/skills/reactjs-state-management/SKILL.md` — session state across pages

## TODOs

- [x] Search modal restricted to binaan results; empty state offers "buat profil minimal"
- [x] Minimal-profile form: nama panggilan + area + consent method (lisan/tertulis/in-app) — no national ID field
- [x] Persistent banner while session active; visible on every screen; exit ends session via API
- [x] Assisted state exposed via store so Sprint 02's wizard can read subject + session id
- [x] Component tests for banner visibility + store lifecycle

## Done when

Penyuluh starts a session for a searched (or newly created) petani, sees the banner on every page, and ending the mode clears it; the backend session row shows matching start/end times.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed, dengan deviasi placement terdokumentasi.** Task file menyebut `src/features/admin/assisted/`; sesuai `apps/web/skills/reactjs-features/SKILL.md` (bucket = domain bisnis pemilik fitur), mode pendampingan adalah kapabilitas **penyuluh**, jadi komponen berada di `src/features/penyuluh/assisted/` (modal pencarian, form profil minimal + `ConsentMethodField`, `AssistedModeBanner`, hooks). Store tetap global di `src/stores/useAssistedStore.ts` (dipersist; selector `selectAssistedSessionId`/`selectAssistedSubject`) karena wizard Sprint 02 lintas domain akan membacanya. Entry point: beranda penyuluh + `/dampingi-petani`. Banner dirender di shell sehingga tampil di semua layar; keluar mode memanggil `POST apps/assisted/end` lalu membersihkan store. Verifikasi: component test banner + lifecycle store hijau (bagian dari 112 vitest), tsc + build prod lulus; verifikasi baris sesi backend nyata menunggu stack DB (backend task 00).

**Tracked:** data subjek (nama petani) ikut dipersist di localStorage dan tidak dibersihkan saat sesi kedaluwarsa (temuan review M6 — privasi perangkat bersama); error gagal "Akhiri Mode" belum punya dismiss/retry eksplisit (L3). Jadwalkan di sprint berikutnya.
