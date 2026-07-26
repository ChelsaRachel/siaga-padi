# Task 01 — Login Page & Session Handling

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
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

- [ ] Login form with schema validation; large touch targets (field-use on phones)
- [ ] Handle lockout response: show retry-after, never reveal whether the account exists
- [ ] Auth store + token refresh; deep-link redirect after login
- [ ] Session-expired modal: draft-preserving re-login (no local draft wipe)
- [ ] Vitest coverage for auth store + service (≥80% new code)

## Done when

Valid login lands on the role home with name in header; locked account shows retry time; opening a protected URL logged-out → login → arrives at that URL.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)
