# Sprint 01 — Auth & Roles

**Status:** ✅ Done
**Created At:** 2026-07-25
**Started At:** 2026-07-26
**Completed At:** 2026-07-26

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

**Progress 2026-07-26:** 5 dari 6 task ✅ Done (backend 01–02, frontend 01–03) — 40 pytest + 112 vitest hijau, tsc + build prod lulus, security review dijalankan dan seluruh temuan blocking diperbaiki (backdoor token boilerplate dihapus, envelope guard top-level, rate limit terdaftar, secret hardcoded dipindah ke settings). Satu-satunya yang tersisa: [`backend/00-schema-auth.md`](./backend/00-schema-auth.md) 🚧 — kode migration/seed selesai, tapi apply + verifikasi RLS dua-user butuh stack Supabase hidup (Docker tidak tersedia di server dev; langkah handoff terdokumentasi di task file). Sprint di-archive setelah verifikasi itu jalan.

## Outcome

Ditutup 2026-07-26 di laptop lokal (Docker Desktop tersedia). Migrasi 0001–0009 diterapkan bersih ke stack Supabase lokal (stack lama ditemukan korup di katalog sistem `pg_attrdef` — di-wipe & di-init ulang). 5 akun pilot sintetis di-seed. RLS diverifikasi dua-user via psql: petani hanya baris sendiri, penyuluh hanya baris dalam kecamatan binaan (Ciparay, Baleendah) — tidak ada kebocoran lintas peran/wilayah. E2E smoke browser: 4 role login dengan beranda + menu berbeda; lockout 5×/15 menit terpicu tepat pada percobaan ke-5 (retry-after ditampilkan, `login_lockouts.failed_count=5`); alur pendampingan penuh (cari → mulai dengan consent lisan → banner "atas nama" persisten lintas halaman → akhiri) tercatat benar di `assisted_sessions`. Semua 6 task Sprint 01 kini ✅ Done — sprint ditutup dan dipindah ke `archive/`.

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/08_ADMINISTRASI_SISTEM.md`](../../../brief/08_ADMINISTRASI_SISTEM.md)
