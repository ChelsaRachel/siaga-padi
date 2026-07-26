# Task 00 — Schema: Profiles, Roles, Assignments, Assisted Sessions

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** yes
**Autonomous:** no — one-time schema migration + seed; reviewed once, then static.

## Goal

Migration yang menambahkan profil aplikasi Siaga Padi di atas boilerplate user schema: role 4 jenis, assignment wilayah binaan, sesi pendampingan, dan RLS sehingga petani hanya membaca miliknya sendiri.

## Contract delivered

- Table `siaga_profiles`: `user_id (fk auth)`, `display_name`, `role ('petani'|'penyuluh'|'admin'|'domain_reviewer')`, `area_kabupaten`, `area_kecamatan`, `account_status ('mandiri'|'didampingi'|'locked'|'inactive')`, `research_consent bool`, `location_consent bool`, timestamps.
- Table `penyuluh_assignments`: `user_id`, `area_kecamatan[]` — scope binaan untuk RLS penyuluh.
- Table `assisted_sessions`: `id`, `actor_user_id (penyuluh)`, `subject_profile_id (petani)`, `consent_method ('lisan'|'tertulis'|'in_app')`, `started_at`, `ended_at`.
- Table `login_lockouts` (atau kolom di profiles): failed count + window + locked_until.
- RLS: petani row-owner only; penyuluh terbatas assignment kecamatan; admin/domain_reviewer per kebijakan FRD §Security.
- Pydantic DTO `ProfileOut`, `AssistedSessionOut` di `apps/backend/dto/` — camelCase untuk FE.

## Files to touch

- `apps/backend/supabase/migrations/0009_siaga_auth.sql` — new migration (numbering continues from 0008)
- `apps/backend/models/siaga_profile.py`, `apps/backend/dto/siaga_profile.py` — model + DTO
- seed script for pilot accounts (1 admin, 1 penyuluh, 1 domain reviewer, 2 petani) — synthetic data only

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — model/migration conventions
- `apps/backend/skills/python-auth/SKILL.md` — how boilerplate auth tables are shaped before extending
- `apps/backend/skills/orchestra.md` — routing to correct backend skill set

## TODOs

- [ ] Draft `0009_siaga_auth.sql` with the four tables + constraints + indexes above
- [ ] Write RLS policies (owner-only petani; assignment-scoped penyuluh) and verify with two test users via Supabase SQL
- [ ] Add models + DTOs; no route changes in this task
- [ ] Seed pilot accounts (synthetic names, no real farmer data)
- [ ] Apply migration on local Supabase stack and record contract in this file if columns shift

## Done when

Migration applies cleanly on the local Supabase stack; `select` as petani test user returns only own profile row; `select` as penyuluh returns only rows in assigned kecamatan.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]` — no unchecked item may remain (defer via `## Revision <date>` if needed)
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done` (change the header first, then check this line)
- [ ] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)
