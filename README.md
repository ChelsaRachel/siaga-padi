# SIAGA PADI

Sistem peringatan dini dan rekomendasi penanganan **hama & penyakit padi** untuk petani dan penyuluh pertanian.

Petani memotret gejala pada tanaman → sistem melakukan triage lewat computer vision → keluar rekomendasi tindakan yang mudah dipahami petani. Penyuluh mendapat dashboard dan peta sebaran untuk memantau wilayah binaannya.

> **Status:** MVP dalam pengembangan. Web PWA sudah di-scaffold; backend, CV service, dan lapisan offline PWA belum dikerjakan.

---

## Stack

| Layer | Tech |
|---|---|
| Web (PWA) | React 18 + TypeScript + Rspack + Zustand + shadcn/ui + Tailwind |
| Backend *(rencana)* | FastAPI (Python) + Supabase — Postgres, Auth, Storage |
| CV service *(rencana)* | PyTorch (EfficientNet-B0 / MobileNetV3) |
| Mobile *(fase 2)* | Flutter |

## Struktur

```
apps/web/     aplikasi web PWA (React + Rspack)
docs/         FRD, handover
design/       design system & token
sprint/       perencanaan sprint
```

## Menjalankan web (dev)

Prasyarat: **Node 20** (lihat `apps/web/.nvmrc`).

```bash
cd apps/web
npm install
npm run dev            # Rspack dev server
npm run build:prod     # build produksi
```

> Belum ada test runner. Backend belum di-scaffold — butuh Docker + Supabase lebih dulu.

## Dokumentasi

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — alur kerja tim: branch, commit, PR.
- [`docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md`](docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md) — spesifikasi produk (in-scope).
- [`docs/HANDOVER.md`](docs/HANDOVER.md) — status kerja terkini untuk estafet sesi.
