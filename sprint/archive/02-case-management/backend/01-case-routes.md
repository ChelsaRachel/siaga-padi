# Task 01 — Case Routes: Create, List, Detail, Timeline, Profile/Lahan

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-case.md`](./00-schema-case.md) — case/field tables + transition table

## Goal

Endpoint kasus & profil: buat kasus idempoten (wizard), daftar + filter riwayat, detail + linimasa, kelola profil/lahan, permintaan penghapusan data — semua patuh RLS dan mode pendampingan.

## Files to touch

- `apps/backend/router/cases.py`, `apps/backend/service/cases.py`, `apps/backend/dto/cases.py`
- `apps/backend/router/farmer_profile.py`, `apps/backend/service/farmer_profile.py` — profil + lahan CRUD + deletion request

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — layering, envelope, pagination
- `apps/backend/skills/python-auth/SKILL.md` — ownership + assisted context

## TODOs

- [x] `POST /cases` with `Idempotency-Key`: replay returns the same case, never a duplicate
- [x] Create validates minimum fields (owner, field-or-area, phase, observed_at) and sets status `draf`
- [x] Assisted create: actor from session, owner = subject petani; recorded on the case
- [x] `GET /cases` (filter lahan/status/date, paginated) + `GET /cases/{id}` + `GET /cases/{id}/timeline` (from `case_events`)
- [x] Profile endpoints: update own profile, CRUD lahan, submit deletion request (recorded, not immediate wipe — retention policy per FRD)
- [x] Unit tests: idempotent replay, assisted ownership, filter correctness

## Done when

Replaying the same create payload+key returns the same `caseCode`; timeline lists the draf-creation event; petani cannot fetch another owner's case (404/403); tests green.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed.** `router/cases.py` (`POST /cases`, `POST /cases/get-all`, `GET /cases/{id}`, `GET /cases/{id}/timeline`) + `router/farmer_profile.py` (`PUT /farmer/profile`, `POST|PUT /farmer/profile/fields`, `POST /farmer/profile/fields/get-all`, `POST|GET /farmer/profile/deletion-request`), service + DTO terpisah, `middleware/user_context.py` (`require_user`), `exceptions/siaga_exceptions.py` + `SiagaNotFoundError` (aditif). Kontrak terkunci di `apps/web/docs/api-spec-case.md`.

Catatan implementasi: daftar memakai konvensi boilerplate `POST …/get-all` + FindDTO (bukan `GET /cases` seperti teks task) karena AI_GUIDE melarang `GET …/get-all`; filter `displayStage` diekspansi server-side ke himpunan status kanonik. Scoping visibilitas seluruhnya server-side per peran; kasus yang tidak terlihat dan kasus tidak ada menghasilkan **404 dengan body identik** (anti-enumerasi) — diuji byte-identical. Verifikasi: **119 pytest hijau**, coverage `service/cases.py` 89%, `service/farmer_profile.py` 86%; endpoint dikonfirmasi lewat boot `python api.py` nyata.

**Hardening hasil security review** (harus dipertahankan): (1) kunci idempotensi hanya boleh direplay oleh **pembuatnya** — `_assert_replay_belongs_to` pada kedua jalur replay (lookup awal & race unique-violation), pesan 400 generik yang tidak mengonfirmasi keberadaan kasus orang lain; (2) `POST /cases` dibatasi peran sesuai kontrak — petani untuk dirinya sendiri, penyuluh **hanya** dengan sesi pendampingan terbuka, peran lain 403 (tanpa ini submit penyuluh tanpa sesi diam-diam menjadikan penyuluh sebagai pemilik kasus); (3) koordinat opt-in divalidasi finite + lat ±90 / lng ±180 di kasus maupun lahan (sebelumnya `Infinity`/`NaN` bisa masuk kolom jsonb).

**Tracked untuk sprint berikutnya:** create belum atomik lintas tiga tulisan PostgREST (lahan → kasus → event) — kegagalan di tengah bisa meninggalkan kasus tanpa event linimasa atau baris lahan orphan; pertimbangkan RPC transaksional. `areaKabupaten`/`areaKecamatan` pada create masih teks bebas dari klien dan ikut menentukan visibilitas penyuluh — perlu whitelist wilayah. Belum ada batas jumlah permintaan penghapusan per pengguna.
