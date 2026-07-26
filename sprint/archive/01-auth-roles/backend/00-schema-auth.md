# Task 00 — Schema: Profiles, Roles, Assignments, Assisted Sessions

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
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

- [x] Draft `0009_siaga_auth.sql` with the four tables + constraints + indexes above
- [x] Write RLS policies (owner-only petani; assignment-scoped penyuluh) and verify with two test users via Supabase SQL — verified live 2026-07-26 (see Notes)
- [x] Add models + DTOs; no route changes in this task
- [x] Seed pilot accounts (synthetic names, no real farmer data) — `scripts/seed_siaga_pilot.py` run 2026-07-26, 5 accounts seeded
- [x] Apply migration on local Supabase stack and record contract in this file if columns shift — applied cleanly, no column shift

## Done when

Migration applies cleanly on the local Supabase stack; `select` as petani test user returns only own profile row; `select` as penyuluh returns only rows in assigned kecamatan.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]` — no unchecked item may remain (defer via `## Revision <date>` if needed)
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done` (change the header first, then check this line)
- [x] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Code complete, verifikasi live tertunda.** Migration `0009_siaga_auth.sql` (4 tabel + index + RLS via `siaga_current_user_id()`/`siaga_current_role()` yang membaca `request.jwt.claims`), model `models/siaga_profile.py`, DTO `dto/siaga_profile.py` (camelCase, kontrak terkunci di `apps/web/docs/api-spec.md`), seed script `scripts/seed_siaga_pilot.py` (5 akun sintetis, password acak per run — dicetak sekali, tidak di-hardcode) — semua selesai dan direview. Kontrak DTO sudah dikonsumsi task 01/02 + FE tanpa perubahan kolom.

**Blocker lingkungan (bukan blocker kode):** tidak ada stack Supabase yang bisa dijangkau di server dev ini — port 8000 dipakai aplikasi lain dan Docker socket permission-denied untuk user `fahri` (bukan anggota grup `docker`). Karena "done when" task ini mensyaratkan apply di stack hidup + verifikasi RLS dua user, task tetap 🚧 sampai langkah berikut dijalankan **di mesin yang punya Docker** (mis. laptop lokal):

1. Jalankan stack Supabase lokal (skill `supabase-init`, atau stack self-hosted yang sudah ada) dan arahkan `SUPABASE_URL`/`SUPABASE_KEY` di `apps/backend/.env`.
2. `psql "$SUPABASE_DB_URL" -f apps/backend/supabase/migrations/0009_siaga_auth.sql` (idempoten — aman diulang).
3. `cd apps/backend && ./venv/bin/python scripts/seed_siaga_pilot.py` (venv dibuat dulu; catat password yang dicetak).
4. Verifikasi RLS dua user via SQL (petani hanya baris sendiri; penyuluh hanya kecamatan binaan), lalu tandai TODO di atas, ubah Status → ✅ Done, dan tambahkan entri `changelog/backend.md`.

**2026-07-26 — Selesai di laptop lokal.** Docker Desktop tersedia; stack `.supabase/docker` yang sudah ada ternyata mengalami korupsi katalog sistem (`pg_attrdef`, "unexpected data beyond EOF") — di-wipe (`teardown.py --wipe`) dan di-init ulang bersih. Migrasi 0001–0009 diterapkan berurutan tanpa error. `scripts/seed_siaga_pilot.py` dijalankan: 5 akun sintetis (admin, penyuluh, domain_reviewer, 2 petani); password tersimpan lokal di `.supabase/pilot-credentials.txt` (gitignored, tidak pernah di-commit). Verifikasi RLS dua user via psql: petani (`de8578cb…`) hanya melihat baris profilnya sendiri; penyuluh (`dcb5f409…`) hanya melihat 3 baris (dirinya + 2 petani) yang cocok dengan `area_kecamatan` binaan (Ciparay, Baleendah) — tidak ada kebocoran baris admin/reviewer. E2E smoke browser (Chrome DevTools MCP) juga dijalankan di sesi yang sama: login ke-4 role menampilkan beranda + menu berbeda; lockout terpicu tepat di percobaan ke-5 (423, pesan retry 15 menit, `login_lockouts.failed_count=5`); alur pendampingan (cari → mulai dengan persetujuan lisan → banner "atas nama" persisten lintas halaman → akhiri) tercatat benar di `assisted_sessions` (actor, subject, consent_method, started_at/ended_at). "Done when" task ini terpenuhi.
