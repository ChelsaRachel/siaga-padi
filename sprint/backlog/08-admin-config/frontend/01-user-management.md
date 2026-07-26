# Task 01 — Manajemen Pengguna & Role (Admin)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-config-routes-health.md`](../backend/01-config-routes-health.md) — user admin endpoints

## Goal

Halaman admin: tabel pengguna (akun, role, wilayah/assignment, status) dengan filter, dan form assignment wilayah/kelompok untuk penyuluh & reviewer.

## Files to touch

- `apps/web/src/pages/user-admin/` + `parts/`
- `apps/web/src/features/admin/users/components/` — user table, role editor, assignment form
- `apps/web/src/services/userAdmin.ts`; `src/routes/` + `src/config/menu/` — admin menu entry

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — table + filter
- `apps/web/skills/reactjs-form/SKILL.md` — assignment form

## TODOs

- [ ] User table with filters (role, wilayah, status); status badges incl. terkunci sementara
- [ ] Role + assignment editing with confirmation; changes audited server-side
- [ ] Deactivation flow; no shared-account creation path
- [ ] Tests: filter, role-change confirmation

## Done when

Admin filters users, changes a penyuluh's assignment area, and the change is reflected in that penyuluh's `/me` scope.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
