# Task 00 — Schema: Farmers, Lahan, Cases, State Machine

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** yes
**Autonomous:** no — one-time schema migration; reviewed once, then static.
**Depends on:**
- [`../../01-auth-roles/backend/00-schema-auth.md`](../../01-auth-roles/backend/00-schema-auth.md) — profiles referenced as case owner/creator

## Goal

Migration domain kasus: lahan, kasus dengan state machine ketat (FRD §6.5–6.6), kunci anti-duplikat, jejak audit transisi, dan RLS kepemilikan.

## Contract delivered

- Table `fields` (lahan): `id`, `owner_profile_id`, `name`, `area_kabupaten`, `area_kecamatan`, `coords (nullable, opt-in only)`, timestamps.
- Table `cases`: `id`, `case_code ('KS-YYYY-NNNNNN')`, `owner_profile_id`, `created_by_profile_id`, `assisted_session_id (nullable)`, `field_id`, `growth_phase ('anakan'|'bunting'|'pengisian_bulir'|…)`, `location_mode ('gps'|'manual_area'|'unknown')`, `status ('draf'|'difoto'|'diproses'|'hasil_siap'|'direview'|'revisi'|'selesai')`, `observed_at`, `idempotency_key (unique)`, `config_version_id (nullable)`, timestamps.
- Table `case_events`: append-only audit of every status transition (`case_id`, `from_status`, `to_status`, `actor_profile_id`, `note`, `created_at`) — the linimasa source.
- DB-level guard (constraint/trigger or service-enforced + tested): only legal transitions per FRD §6.5–6.6; no status skipping.
- RLS: owner reads own cases; penyuluh reads cases in binaan areas; creator recorded separately from owner (assisted).
- DTOs `CaseOut`, `CaseEventOut`, `FieldOut` (camelCase).

## Files to touch

- `apps/backend/supabase/migrations/0010_siaga_case.sql`
- `apps/backend/models/`, `apps/backend/dto/` — case/field/event models + DTOs

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration/model conventions
- `.claude/rules/project-scope.md` — MVP: real DB allowed

## TODOs

- [x] Draft `0010_siaga_case.sql` (tables, enums, unique idempotency key, indexes on owner/status/area)
- [x] Encode the legal transition table from FRD §6.5–6.6 (single source, importable by services)
- [x] `case_events` append-only (no update/delete grants)
- [x] RLS owner/penyuluh policies verified with test users — *verified on the local Supabase stack (see Notes)*
- [x] Models + DTOs; migration applied on local stack — *applied and verified on 2026-07-26*

## Done when

Migration applies; inserting an out-of-order transition fails; duplicate `idempotency_key` insert fails; petani test user sees only own cases; penyuluh sees only binaan-area cases.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Code complete, verifikasi live tertunda.** `0010_siaga_case.sql` (idempoten): tabel `fields`, `cases`, `case_events`, `data_deletion_requests` + index + RLS + sequence/fungsi `next_case_code()` ('KS-YYYY-NNNNNN'). Penegakan state machine ada di **dua lapis**: trigger DB `enforce_case_transition()` dan tabel Python satu-sumber `LEGAL_TRANSITIONS` di `models/siaga_case.py` — keduanya cermin FRD §6.5–6.6 (wajib diubah bersamaan). `case_events` append-only via trigger `forbid_case_event_mutation()` (UPDATE/DELETE ditolak untuk semua role, termasuk service key). DTO camelCase di `dto/siaga_case.py`. 8 unit test state machine + display-stage hijau.

**Keputusan penting (deviasi terdokumentasi dari teks task):** task file menyebut `status ('draf'|'difoto'|…)` 7 nilai Indonesia; yang diimplementasikan adalah **15 status kanonik FRD** (DRAFT…CANCELLED). Alasan: brief `01_MANAJEMEN_KASUS_PETANI.md` menyatakan FRD otoritatif bila berbeda, dan Sprint 03/05/06 membutuhkan status penuh (QUALITY_REJECTED, NEEDS_CONTEXT, dst.) yang tidak ada di daftar 7 nilai. Tahap berbahasa Indonesia tetap tersedia sebagai `displayStage` yang diturunkan server-side (`DISPLAY_STAGE_MAP`) dan itulah yang dirender FE — tidak pernah disimpan di DB.

**Blocker lingkungan (sama seperti Sprint 01 task 00):** server dev ini tidak punya akses Docker (socket permission-denied untuk user `fahri`), jadi apply migration + verifikasi RLS dua-user harus dijalankan di Mac. Langkah penyelesaian:

1. `docker cp apps/backend/supabase/migrations/0010_siaga_case.sql supabase-db:/tmp/m10.sql && docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/m10.sql`
2. Uji negatif state machine: `update cases set status='REVIEWED' where status='DRAFT'` → harus gagal (errcode 23514); `update case_events set note='x'` → harus gagal (55000); insert `idempotency_key` duplikat → harus gagal.
3. Verifikasi RLS dua-user (pola `begin; set local role authenticated; set local request.jwt.claims = '{"user_id":"…"}'; select … ; commit;` dalam SATU `-c`): petani hanya kasus miliknya; penyuluh hanya kasus di kecamatan binaan.
4. Setelah lulus: centang dua TODO di atas, ubah Status → ✅ Done, tambahkan entri `changelog/backend.md`.

**Risiko dicatat untuk sprint berikutnya (temuan review):** scoping penyuluh mencocokkan **nama kecamatan** telanjang tanpa kualifikasi kabupaten (di RLS maupun service). Nama kecamatan tidak unik antar kabupaten di Indonesia, sehingga penyuluh bisa melihat kasus dari kabupaten lain yang kebetulan bernama sama. Keputusan model data (memasangkan kabupaten+kecamatan di `penyuluh_assignments`) sebaiknya diambil **sebelum** fitur area Sprint 09 dibangun di atasnya.

**2026-07-26 — Verifikasi live selesai di Mac.** Migration `0010_siaga_case.sql` diterapkan tanpa error pada stack Supabase lokal yang sehat. Uji negatif berbasis transaksi membuktikan `DRAFT → REVIEWED` ditolak dengan SQLSTATE `23514`, mutasi `case_events` ditolak dengan `55000`, dan duplikasi `idempotency_key` ditolak dengan `23505`. Uji RLS memakai claim tiga akun sintetis: petani Budi hanya melihat 1 kasus miliknya; petani Siti melihat 2 kasus miliknya; penyuluh Dewi hanya melihat 2 kasus di Ciparay/Baleendah dan tidak melihat kasus Soreang. Transaksi verifikasi di-rollback setelah bukti diambil. Suite backend tetap hijau: 119 pytest.
