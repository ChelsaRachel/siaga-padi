# Task 03 — Assisted Mode UI (Modal + Banner "Atas Nama")

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
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

- [ ] Search modal restricted to binaan results; empty state offers "buat profil minimal"
- [ ] Minimal-profile form: nama panggilan + area + consent method (lisan/tertulis/in-app) — no national ID field
- [ ] Persistent banner while session active; visible on every screen; exit ends session via API
- [ ] Assisted state exposed via store so Sprint 02's wizard can read subject + session id
- [ ] Component tests for banner visibility + store lifecycle

## Done when

Penyuluh starts a session for a searched (or newly created) petani, sees the banner on every page, and ending the mode clears it; the backend session row shows matching start/end times.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)
