# Task 01 — Auth Routes: Login, Session, Lockout, /me

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-auth.md`](./00-schema-auth.md) — profiles/lockout tables must exist

## Goal

Endpoint auth yang membungkus Supabase-issued JWT: login, refresh, `/me` (role + assignment), dan kunci akun sementara setelah 5 kegagalan dalam 15 menit — dengan pesan yang tidak membocorkan keberadaan akun.

## Files to touch

- `apps/backend/router/siaga_auth.py` — login/refresh/me endpoints (register in `api.py`)
- `apps/backend/service/siaga_auth.py` — lockout window logic, audit entries
- `apps/backend/dto/siaga_auth.py` — request/response DTOs (camelCase)
- `apps/backend/middleware/` — role guard dependency (petani/penyuluh/admin/domain_reviewer)

## Skills to consult

- `apps/backend/skills/python-auth/SKILL.md` — boilerplate auth flow to extend, JWT verification
- `apps/backend/skills/python-api-design/SKILL.md` — router/service/dto layering + response envelope
- `apps/backend/skills/python-logging/SKILL.md` — audit log conventions

## TODOs

- [x] Login endpoint delegating credential check to Supabase auth, returning session + profile
- [x] Lockout: 5 failures / 15 min window → temporary lock with retry-after; identical error body whether or not the account exists
- [x] `/me` returns role, display name, assignment areas — the FE shell contract
- [x] Role-guard dependency usable as `Depends(require_role(...))` by later sprints
- [x] Audit entries for login success/failure/lockout (no passwords, no tokens in logs)
- [x] Unit tests: lockout window, role guard allow/deny, envelope shape (≥80% on new service code)

## Done when

Valid credentials → 200 + session + camelCase profile; 5 bad attempts within 15 min → locked response with clear retry time; `/me` with a penyuluh token includes assignment kecamatan list; tests green.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed.** Endpoints `POST /siaga/auth/login`, `POST /siaga/auth/refresh`, `GET /siaga/auth/me` per kontrak `apps/web/docs/api-spec.md`. Kredensial dicek terhadap tabel `"user"` (bcrypt, boilerplate flow) — bukan GoTrue, karena boilerplate menerbitkan JWT-nya sendiri; lockout persisten di `login_lockouts` dengan konstanta `LOCKOUT_*` di `service/siaga_auth.py`. Verifikasi: 40 unit test hijau (fake repo seam, api.py tidak diimpor), coverage `service/siaga_auth.py` 89%, `middleware/role_guard.py` 88%; boot nyata `python api.py` diverifikasi (OpenAPI memuat semua route).

**2026-07-26 — Hardening pasca security review** (harus dipertahankan): backdoor token hardcoded di `auth/auth_bearer.py` dihapus; token invalid kini 401 (bukan 403) agar refresh-flow FE terpicu; penolakan role guard dirender sebagai envelope top-level via `register_siaga_exception_handlers` (didaftarkan di `api.py` + tests/conftest); `RateLimitMiddleware` didaftarkan (RATE_LIMIT=300/60 dtk per IP); seed OTP TOTP + secret change-token pindah ke `settings.*` (`OTP_TOTP_SEED`, `JWT_CHANGE_SECRET` di `.env`).

**Tracked untuk sprint berikutnya** (temuan review, tidak memblokir): penghitung kegagalan per-IP di samping lockout per-email (H4); refresh token belum dirotasi/di-revoke server-side (H1 — mitigasi: `JWT_REFRESH` lebih pendek atau rotasi one-time-use); CORS `*` dan reuse `JWT_SECRET` untuk SessionMiddleware harus dibereskan sebelum deploy non-lokal (M2/M3); klaim `role` di refresh token bisa basi — guard sudah baca role dari DB, jangan pernah baca dari klaim token (M5); E2E terhadap DB hidup menunggu stack Supabase (lihat task 00).
