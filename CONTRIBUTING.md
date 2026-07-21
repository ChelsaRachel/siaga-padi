# Contributing — Siaga Padi

Panduan kerja tim biar konsisten dan rapi. Wajib dibaca sebelum push pertama.

Detail teknis git ada di skill **`/git-flow`** (`.claude/skills/git-flow/SKILL.md`). Dokumen ini
adalah ringkasan "cara kita kerja".

---

## TL;DR alur per fitur

```bash
git switch development && git pull          # 1. mulai dari yang terbaru
git switch -c feat/<slug>                   # 2. satu fitur = satu branch
# ...kerja + commit (Conventional Commits, tanpa trailer)...
git push -u origin feat/<slug>              # 3. push ke branch fitur
gh pr create --base development --fill       # 4. buka PR ke development
# 5. review → merge (JANGAN hapus branch) → selesai
```

---

## Branch model

| Branch | Peran |
|--------|-------|
| `development` | **Trunk / integrasi.** Terproteksi — tidak ada push langsung, semua lewat PR. |
| `feat/<slug>` `fix/<slug>` `chore/<slug>` `refactor/<slug>` `docs/<slug>` `hotfix/<slug>` | Branch kerja, **pendek, satu per fitur/tugas**, dicabang dari `development`. |
| `main` | (Nanti) kode rilis/stabil. Belum dipakai selama MVP. |

- **Slug**: huruf kecil, kebab-case, ≤ 4 kata, sesuai unit kerjanya. Contoh: `feat/tani-ramah-design`.
- **Branch per-fitur, bukan per-orang.** Branch personal (`dev-fahri`, `dev-chelsa`) dianggap legacy —
  biasakan feature branch supaya PR kecil dan mudah di-review.
- **Branch TIDAK dihapus setelah merge** — kebijakan tim ini untuk history yang transparan. Saat
  merge di GitHub, biarkan opsi "Delete branch" tidak dicentang.

---

## Aturan sebelum mulai & saat jalan

1. **Selalu cabang dari `development` terbaru** (`git switch development && git pull` dulu).
2. **Sync berkala** selama fitur berjalan biar konflik kecil:
   `git fetch origin && git merge origin/development` (di branch fitur).
3. **Satu PR = satu fitur.** Target selalu `development`. Merge hanya setelah **review + CI hijau**.

---

## Aturan commit — Conventional Commits, tanpa watermark

Format: `<type>(<scope>): <ringkasan imperatif>` (≤ 50 char, tanpa titik di akhir).

Type: `feat` · `fix` · `chore` · `docs` · `refactor` · `perf` · `test` · `build` · `ci` · `style` · `revert`.

- Tulis **body** kalau alasan ("kenapa") tidak jelas dari subjek.
- **Tanpa trailer / watermark** — tidak ada `Co-Authored-By` atau tanda tool. Pesan berhenti di body.
  > Kalau Claude Code CLI menambah trailer otomatis, matikan dengan
  > `"includeCoAuthoredBy": false` di `settings.json`.
- Staging sempit: `git add <path>` spesifik, **jangan** `git add -A` tanpa cek `git status` dulu.

Contoh:
```
feat(auth): add login page + auth store

- LoginPage wires the shadcn form to useAuthStore.
- AuthGuard redirects unauthenticated users to /login.
```

---

## Skill yang dipakai & kapan

| Skill | Kapan dipakai | Hasil |
|-------|---------------|-------|
| **`/git-flow`** | Setiap menyentuh git: branch, stage, commit, push, PR, tag, changelog, atau saat recovery (push gagal, salah branch). | Nama branch, format commit, dan disiplin push yang seragam. |
| **`/session-handover`** | Saat **berhenti/pause** dan kerjaan perlu dilanjutkan orang lain / sesi baru (atau chat sudah panjang). | `docs/HANDOVER.md` + `docs/CONTINUE-PROMPT.md` — estafet tanpa perlu riwayat chat. |

Alur gabungannya: kerja di `feat/<slug>` dengan disiplin `/git-flow` → kalau berhenti di tengah,
jalankan `/session-handover` dan commit HANDOVER di branch itu → teammate tinggal baca untuk lanjut.

---

## Setup awal (sekali per mesin)

```bash
gh auth login        # GitHub.com → HTTPS → login via browser
gh auth status       # pastikan "Logged in to github.com as <kamu>"
```

Alternatif SSH ada di `/git-flow` Step 1. **Jangan** menaruh token di URL remote atau commit `.env`.

---

## Referensi

- **`.claude/skills/git-flow/SKILL.md`** — workflow git lengkap (auth, branch, commit, PR, tag, recovery).
- **`docs/HANDOVER.md`** — status kerja terkini untuk estafet.
- **`docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md`** — spesifikasi produk (in-scope).
