# SIAGA PADI

Sistem peringatan dini dan rekomendasi penanganan **hama & penyakit padi** untuk petani dan penyuluh pertanian.

Petani memotret gejala pada tanaman → sistem melakukan triage lewat computer vision → keluar rekomendasi tindakan yang mudah dipahami petani. Penyuluh mendapat dashboard dan peta sebaran untuk memantau wilayah binaannya.

> **Status:** MVP dalam pengembangan. Web PWA, backend FastAPI, dan Supabase self-hosted
> sudah berjalan secara lokal (sprint 01–03 selesai); CV service belum dikerjakan.

---

## Stack

| Layer | Tech |
|---|---|
| Web (PWA) | React 18 + TypeScript + Rspack + Zustand + shadcn/ui + Tailwind |
| Backend | FastAPI (Python) + Supabase — Postgres, Auth, Storage + Redis |
| CV service *(rencana)* | PyTorch (EfficientNet-B0 / MobileNetV3) |
| Mobile *(fase 2)* | Flutter |

## Struktur

```
apps/web/       aplikasi web PWA (React + Rspack)
apps/backend/   API FastAPI (Python)
.supabase/      stack Supabase self-hosted (Docker)
scripts/dev.sh  orkestrator stack development lokal
docs/           FRD, handover
design/         design system & token
sprint/         perencanaan sprint
```

## Menjalankan stack development

Prasyarat: **Node 20** (lihat `apps/web/.nvmrc`), **Python 3.12**, **Docker Desktop**, **tmux**.

Sekali saja — pastikan Docker Desktop menyala otomatis saat login, supaya Supabase
dan Redis (keduanya `restart: unless-stopped`) ikut naik sendiri setelah reboot:

> Docker Desktop → Settings → General → centang **"Start Docker Desktop when you sign in"**

Lalu satu perintah untuk seluruh stack:

```bash
./scripts/dev.sh          # Supabase + Redis + backend + web, lalu attach ke tmux
./scripts/dev.sh down     # matikan semuanya
./scripts/dev.sh status   # cek container & session
./scripts/dev.sh attach   # masuk lagi ke tmux yang sudah jalan
```

| Layanan | URL |
|---|---|
| Web | http://localhost:3000 |
| Backend | http://localhost:8020/docs |
| Supabase Studio | http://localhost:8000 |

Backend dan web berjalan sebagai window tmux (`Ctrl-b n` untuk pindah, `Ctrl-b d`
untuk detach tanpa mematikan). Menjalankan tiap layer terpisah tetap bisa:

```bash
cd apps/web && npm run dev                   # web saja
cd apps/backend && venv/bin/python api.py    # backend saja
sh .supabase/docker/run.sh start             # Supabase saja
```

> **Catatan:** stack ini hanya hidup selama MacBook menyala. Untuk akses 24/7
> (uji lapangan, demo klien) diperlukan deployment ke VPS atau PaaS.

## Dokumentasi

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — alur kerja tim: branch, commit, PR.
- [`docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md`](docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md) — spesifikasi produk (in-scope).
- [`docs/HANDOVER.md`](docs/HANDOVER.md) — status kerja terkini untuk estafet sesi.
