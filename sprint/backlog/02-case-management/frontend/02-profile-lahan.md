# Task 02 — Profil Petani & Daftar Lahan

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
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

- [ ] Profile card: nama panggilan, area domisili, status akun (mandiri/didampingi), consent lokasi & riset (ikon + teks)
- [ ] Lahan gallery: add/edit; open lahan → riwayat kasus lahan itu (filter preset, Task 03)
- [ ] Deletion request flow with confirmation and honest copy (processed per retention policy, not instant)
- [ ] No national-ID field anywhere
- [ ] Component tests for consent indicators + lahan form

## Done when

Petani edits own profile & lahan; opening a lahan shows its case history; deletion request submits and shows recorded status.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)
