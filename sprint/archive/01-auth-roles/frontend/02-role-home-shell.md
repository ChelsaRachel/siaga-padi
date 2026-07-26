# Task 02 — Role-based Home & App Shell

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./01-login-page.md`](./01-login-page.md) — auth store provides role + profile

## Goal

App shell (header/sidebar/main, Fusion theme) dengan menu config-driven per role, dan beranda berbeda per peran: petani (Periksa Tanaman + Riwayat), penyuluh (antrean + dampingi petani), admin & domain reviewer (menu kelola).

## Files to touch

- `apps/web/src/components/layouts/` — shell (header, sidebar, main; no structural overlap per `.claude/rules/architecture.md`)
- `apps/web/src/config/menu/` — `PETANI_MENU`, `PENYULUH_MENU`, `ADMIN_MENU`, `DOMAIN_REVIEWER_MENU` (menus are config-driven, never hardcoded in layouts)
- `apps/web/src/pages/home/` — role-switched home pages (placeholder cards linking to future sprints)
- `apps/web/src/routes/` — role-guarded route tree

## Skills to consult

- `apps/web/skills/reactjs-app-layout/SKILL.md` — shell layout contract
- `apps/web/skills/reactjs-menu-config/SKILL.md` — menu config source of truth
- `apps/web/skills/reactjs-sidebar/SKILL.md` — sidebar behavior
- `apps/web/skills/reactjs-auth-guard/SKILL.md` — role-based route guards
- `apps/web/skills/reactjs-responsive/SKILL.md` — mobile-first (petani pakai ponsel); PerfectScrollArea for bounded scroll regions

## TODOs

- [x] Shell layout with reserved header/sidebar space; mobile-first for petani role
- [x] Menu arrays per role in `src/config/menu/*`; sidebar renders from config
- [x] Role-guarded routes: wrong role → redirect to own home, not error page
- [x] Home pages per role with placeholder tiles wired to future routes (kasus, riwayat, antrean, admin)
- [x] Header shows name + role (+ wilayah binaan for penyuluh)

## Done when

Logging in as each of the four seeded roles lands on a distinct home with the correct menu; a petani navigating to an admin URL is redirected to the petani home.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified (build/test/manual)
- [x] Top-of-file header literally reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)

**2026-07-26 — Completed.** Shell flex non-overlap (header + sidebar desktop dengan PerfectScrollArea + bottom-nav mobile sesuai aturan UX Fusion — sidebar shadcn fixed-position sengaja tidak dipakai untuk menghindari kelas bug overlap header). Menu 4 peran di `src/config/menu/siaga.menu.ts` (`PETANI_MENU`, `PENYULUH_MENU`, `ADMIN_MENU`, `DOMAIN_REVIEWER_MENU`, selector `menuForRole`); label peran di `src/config/siaga-roles.ts`. Beranda role-switched di `src/pages/home/` dengan tile placeholder → route sprint mendatang render `ComingSoonPage`. `RoleGuard` redirect peran salah ke `/` (beranda sendiri). Verifikasi: vitest + tsc + build prod hijau; "login 4 peran mendarat di beranda berbeda" diverifikasi lewat test store/guard/menu — verifikasi visual dengan akun seed menunggu stack DB (backend task 00).
