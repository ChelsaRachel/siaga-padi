# Siaga Padi — Project Overview

| Attribute | Value |
|---|---|
| Project name | Siaga Padi |
| Stage | **MVP** |
| Channel | Responsive Web Application / PWA (native mobile is Phase 2) |
| Product Owner / Technical Owner | Fahri Alfiansyah |
| CV & Dataset Owner | Chelsa Rachel Wibowo |
| Authoritative spec | [`docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md`](../docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md) |
| Target MVP | 16 Agustus 2026 |

## What it is

Siaga Padi is a rice pest/disease **early-warning and advisory** app for farmers and
extension officers (penyuluh). It is **penyuluh-assisted, farmer-accessible**: farmers
run simple self-checks; penyuluh act as reviewer and follow-up manager. Computer Vision
and LLM output is **triage / early indication only** — never a final agronomic diagnosis.

The full functional, data, AI, security, and testing baseline lives in the FRD above.
This overview is intentionally thin; the FRD is the source of truth.

## Stacks (this repo)

| Stack | Location | Status |
|---|---|---|
| Web (React 18 + Rspack + Zustand + shadcn/ui, Fusion theme) | `apps/web/` | Scaffolded (web-first) |
| Backend (FastAPI + Supabase, `be-python`) | `apps/backend/` | Scaffolded 2026-07-22 |

## Infrastructure

- **Supabase** (self-hosted, Docker) at `.supabase/` inside the repo root (gitignored).
  Credentials contract: `.supabase/credentials.env`. Brought up via
  `.claude/skills/supabase-init/`.
- The backend reads Supabase + secrets from `apps/backend/.env` (gitignored).

## Scope notes

- MVP scope allows a real database (Supabase) — see `.claude/rules/project-scope.md`.
- Keep the setup **lean**: the `be-python` boilerplate ships an `agent-mgmt` router and
  migration `0008_agent_mgmt.sql`. This project currently has **no agent workforce**, so
  the agent-management machinery is present but unused — do not expand it unless a
  concrete agent need appears.

## Struktur Dokumen Brief

Project slug: `siaga_padi`. Brief modul diturunkan dari 14 FR di FRD; setiap file merangkum untuk perencanaan — FRD tetap sumber kebenaran.

| File | Modul | FR |
|------|-------|-----|
| `01_MANAJEMEN_KASUS_PETANI.md` | Profil petani, lahan, consent, pembuatan kasus + hasil & riwayat petani | FR-002, FR-009 |
| `02_PENGAMBILAN_FOTO_KUALITAS.md` | Capture foto terpandu + gerbang kualitas + panduan foto ulang | FR-003, FR-004 |
| `03_TRIASE_REKOMENDASI_AI.md` | Indikasi CV + kuesioner konteks + rekomendasi berbasis bukti | FR-005, FR-006, FR-007 |
| `04_REVIEW_PENYULUH.md` | Antrean review, koreksi beralasan, tindak lanjut | FR-008 |
| `05_DASHBOARD_PETA_WILAYAH.md` | KPI, antrean prioritas, peta agregat wilayah (Should/MVP Extended) | FR-010 |
| `06_TATA_KELOLA_PENGETAHUAN.md` | Kurasi & persetujuan basis pengetahuan + sitasi | FR-011 |
| `07_UMPAN_BALIK_DATASET.md` | Antrean kandidat dataset dari koreksi lapangan (Should/MVP Extended) | FR-012 |
| `08_ADMINISTRASI_SISTEM.md` | Auth/role/mode pendampingan + konfigurasi model-penyedia-ambang | FR-001, FR-013 |
| `09_MODE_OFFLINE_FALLBACK.md` | Offline PWA, antrean sinkronisasi, fallback berbasis aturan | FR-014 |

Alur inti antar modul: `01 (kasus) → 02 (foto) → 03 (triase & rekomendasi) → 04 (review) → 05 (dashboard)`; `06` memasok rujukan ke `03`; `04` memasok kandidat ke `07`; `08` mengendalikan konfigurasi `02/03/06`; `09` melapisi semua alur klien + fallback `03`. Detail workflow dan state machine: FRD §6.

## Konsolidasi Kebutuhan Data Eksternal

| Modul | Sumber | Jenis | Catatan |
|-------|--------|-------|---------|
| 06 | BB Padi / Balitbangtan, Balai POPT, IRRI Knowledge Bank | Dokumen panduan resmi (kurasi manual MVP) | Catat lisensi per sumber |
| 05 | Layanan peta dasar (basemap) | Latar peta wilayah | Kunci akses dikelola sebagai rahasia sistem |
| 03 | Layanan AI bahasa eksternal + jalur cadangan | Layanan (bukan data); pilihan penyedia diatur Modul 08 | Batas pemakaian tier gratis; fallback aturan wajib teruji |

## Blind Spot Review

### Asumsi Tertandai

| Asumsi | Dampak Kalau Salah |
|--------|---------------------|
| Section "Stack Agent Modul" di-skip di semua modul: pipeline sistem deterministik, tanpa agent workforce (sesuai arahan keep-it-lean) | Jika kebutuhan agent muncul, brief modul terkait perlu revisi + `agent-builder` dilibatkan |
| Nama komponen visual & alur langkah diturunkan dari UI/UX requirements FRD; layout final milik `design/web/fusion/DESIGN.md` | Konflik desain diselesaikan dengan DESIGN.md sebagai otoritas visual |
| Standar layanan ditulis deskriptif (cepat/sedang/toleran); angka NFR persis tetap di FRD §2.5 & §15 sebagai kontrak | Tim downstream wajib cek angka FRD, bukan hanya brief |
| Referensi implementasi (Plantix, Rice Doctor, dll.) adalah benchmark inspiratif, belum diverifikasi ulang | Rendah — hanya inspirasi pola |

### Status Brief

**Status**: `ready_for_execution` — Tier 1 lengkap dari FRD (validated); confidence **high** karena satu sumber otoritatif dengan flow, business rules, dan acceptance criteria lengkap.
