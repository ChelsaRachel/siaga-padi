# Task 01 — Login Page & Session Handling

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-auth-routes.md`](../backend/01-auth-routes.md) — login/me endpoints + DTO shape

## Goal

Halaman login sederhana (form kredensial, tanpa akun bersama) dengan penanganan sesi: sukses → redirect ke beranda peran; terkunci → pesan jelas kapan bisa coba lagi; sesi berakhir → modal ajakan login ulang tanpa kehilangan draf lokal non-sensitif.

## Files to touch

- `apps/web/src/pages/login/` — login page + parts
- `apps/web/src/services/auth.ts` — login/refresh/me API client
- `apps/web/src/stores/` — auth store (Zustand): session, profile, role
- `apps/web/src/routes/` — public route + post-login redirect carrying intended destination

## Skills to consult

- `apps/web/skills/reactjs-auth-guard/SKILL.md` — session guard + redirect pattern
- `apps/web/skills/reactjs-form/SKILL.md` — form + validation conventions
- `apps/web/skills/reactjs-service/SKILL.md` — API client + error envelope handling
- `apps/web/skills/reactjs-error-handling/SKILL.md` — user-friendly error states

## TODOs

- [x] Login form with schema validation; large touch targets (field-use on phones)
- [x] Handle lockout response: show retry-after, never reveal whether the account exists
- [x] Auth store + token refresh; deep-link redirect after login
- [x] Session-expired modal: draft-preserving re-login (no local draft wipe)
- [x] Vitest coverage for auth store + service (≥80% new code)

## Done when

Valid login lands on the role home with name in header; locked account shows retry time; opening a protected URL logged-out → login → arrives at that URL.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed.** Path aktual sedikit berbeda dari "Files to touch": service bernama `src/services/siaga-auth.service.ts` (mengikuti pola `*.service.ts` boilerplate, bukan `auth.ts`), halaman di `src/pages/auth/LoginPage.tsx` (rewrite dari demo boilerplate), form/dialog di `src/features/shared/auth/`. Token di body (bukan cookie) per kontrak — `api-client.ts` diedit terkontrol: Bearer dari store, refresh queue, normalisasi error (termasuk fallback `detail` string dari dependency boilerplate). Verifikasi: 112 vitest hijau, `tsc --noEmit` bersih, `npm run build:prod` sukses; coverage file baru ~100%.

**2026-07-26 — Hardening pasca security review:** `_retry` di-set sebelum antre pada refresh queue (anti retry-storm, H2); `isSessionExpired` ikut dipersist supaya reload saat sesi kedaluwarsa tetap memunculkan dialog re-login (H3); path redirect deep-link disanitasi (`/` tunggal saja, tolak `//`, M7).

**Tracked:** refresh token dipersist di localStorage (tradeoff PWA offline — mitigasi CSP/rotasi dicatat di task backend 01); `me()` belum dipanggil saat boot untuk rekonsiliasi role (M8, jadwalkan Sprint 02); E2E login nyata menunggu stack Supabase (lihat backend task 00).
