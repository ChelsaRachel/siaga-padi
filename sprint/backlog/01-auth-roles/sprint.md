# Sprint 01 — Auth & Roles

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

## Goal

Semua pengguna bisa login dengan akun pribadi, mendarat di beranda sesuai peran (Petani / Penyuluh / Admin / Domain Reviewer), dan penyuluh bisa mengaktifkan mode pendampingan berjejak — brief [`08_ADMINISTRASI_SISTEM.md`](../../../brief/08_ADMINISTRASI_SISTEM.md) (FR-001).

## Acceptance

- Login dengan kredensial valid → beranda sesuai role dengan nama + role + wilayah binaan (penyuluh).
- 5 kali gagal login dalam 15 menit → akun terkunci sementara dengan pesan yang tidak membocorkan keberadaan akun.
- Penyuluh mengaktifkan "Dampingi Petani" → banner "atas nama" tampil; aksi tercatat pelaku + subjek + metode consent + waktu.
- Petani hanya melihat data miliknya sendiri (ditegakkan di lapisan data, bukan hanya UI).

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce (brief: pipeline deterministik, keep-it-lean). Roles: `be_service` (auth/role/assisted endpoints), `fe_shell` (login + beranda per peran).

## Cross-stack dependencies

`backend/00-schema-auth.md` is the foundation: profiles/roles/assignments/assisted-session tables + RLS. Both backend routes and all frontend tasks consume that contract.

## Dependency graph

```
backend/00-schema-auth.md (foundation)
    ↓
    ├─ backend/01-auth-routes.md
    ├─ backend/02-assisted-mode-routes.md
    └─ frontend/01-login-page.md → frontend/02-role-home-shell.md → frontend/03-assisted-mode-ui.md
```

## Notes

- Supabase-issued JWT is the auth mechanism (see `.claude/rules/architecture.md`); self-hosted Supabase stack per `brief/00_OVERVIEW.md` § Infrastructure.
- No shared accounts in the pilot; user/role *administration UI* is Sprint 08 — this sprint only seeds accounts via migration/script.

## Outcome

(Filled in when the sprint moves to `archive/`.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/08_ADMINISTRASI_SISTEM.md`](../../../brief/08_ADMINISTRASI_SISTEM.md)
