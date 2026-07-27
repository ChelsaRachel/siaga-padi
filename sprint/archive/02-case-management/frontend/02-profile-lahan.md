# Task 02 — Profil Petani & Daftar Lahan

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-case-routes.md`](../backend/01-case-routes.md) — profile/lahan endpoints

## Goal

Halaman profil ringkas (nama panggilan, area, status akun, indikator consent) dan galeri kartu lahan (nama, area, fase terakhir, jumlah kasus) dengan tambah/ubah lahan dan permintaan penghapusan data.

## Files to touch

- `apps/web/src/pages/profile/` + `parts/` — profile card, consent indicators, deletion request
- `apps/web/src/features/case/fields/components/` — lahan card gallery + add/edit form
- `apps/web/src/services/farmerProfile.ts` — API client
- `apps/web/src/routes/` + `src/config/menu/` — route + menu entry

## Skills to consult

- `apps/web/skills/reactjs-features/SKILL.md` — placement
- `apps/web/skills/reactjs-form/SKILL.md` — profile/lahan forms
- `apps/web/skills/reactjs-data-display/SKILL.md` — card gallery pattern

## TODOs

- [x] Profile card: nama panggilan, area domisili, status akun (mandiri/didampingi), consent lokasi & riset (ikon + teks)
- [x] Lahan gallery: add/edit; open lahan → riwayat kasus lahan itu (filter preset, Task 03)
- [x] Deletion request flow with confirmation and honest copy (processed per retention policy, not instant)
- [x] No national-ID field anywhere
- [x] Component tests for consent indicators + lahan form

## Done when

Petani edits own profile & lahan; opening a lahan shows its case history; deletion request submits and shows recorded status.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed.** Halaman `/profil` (`src/pages/profile/` + parts: ProfileCard, ConsentIndicator, ProfileEditDialog, DeletionRequestSection) dan galeri lahan di `src/features/case/fields/` (FieldCard, FieldFormDialog, store). Service `src/services/farmer-profile.service.ts` (konvensi `{module}.service.ts`, bukan `farmerProfile.ts`). Membuka kartu lahan → `/riwayat?fieldId=…` (preset filter dikonsumsi Task 03). Permintaan penghapusan memakai teks jujur: "dicatat dan diproses sesuai kebijakan retensi — bukan penghapusan seketika", lalu menampilkan badge status `tercatat` dari server. **Tidak ada field nomor identitas nasional** di mana pun (diperiksa ulang saat review). Entri menu "Profil" ditambahkan ke `PETANI_MENU` (config-driven, total 4 item — masih di bawah batas 5 untuk bottom-nav). Verifikasi: test komponen indikator consent + validasi nama lahan 2–100 hijau; bagian dari 152 vitest, tsc + build prod lulus.

**Catatan:** validasi panjang `displayName` di FE 100 karakter sedangkan DTO backend 160 — FE lebih ketat, tidak berbahaya, tapi selaraskan bila muncul keluhan. Koordinat lahan (opt-in) kini divalidasi rentang di backend (lat ±90 / lng ±180) sebagai bagian hardening review.
