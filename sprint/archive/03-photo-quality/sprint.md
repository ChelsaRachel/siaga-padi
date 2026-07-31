# Sprint 03 — Photo & Quality

**Status:** ✅ Done
**Created At:** 2026-07-25
**Started At:** 2026-07-29
**Completed At:** 2026-07-29

## Goal

Pengguna dipandu mengambil 2–3 foto daun layak analisis (bingkai panduan, contoh baik/buruk), unggah dengan progres + coba-ulang, dan gerbang kualitas menolak foto tak layak dengan alasan sederhana + tips — brief [`02_PENGAMBILAN_FOTO_KUALITAS.md`](../../../brief/02_PENGAMBILAN_FOTO_KUALITAS.md) (FR-003, FR-004).

## Acceptance

- Kamera penuh-layar dengan bingkai panduan; kamera tak tersedia → unggah galeri dengan panduan sama.
- Foto ditolak menampilkan maks 3 alasan sederhana + tips + contoh; petani tidak pernah melihat skor teknis.
- Data lokasi tertanam (EXIF) dihapus sebelum tersimpan; duplikat tidak terkirim dua kali.
- 3× retake gagal → opsi "Kirim ke Penyuluh Saja" (tanpa analisis otomatis); 2 foto layak → kasus lanjut otomatis ke analisis.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce. `be_service` (upload + quality gate deterministik), `fe_shell` (kamera terpandu + umpan balik kualitas).

## Cross-stack dependencies

`backend/00-schema-photos.md` (case_photos + storage) is the foundation for the upload/quality routes and all FE tasks. Quality thresholds read from seeded config version (formalized in Sprint 08); every photo records the threshold version used.

## Dependency graph

```
backend/00-schema-photos.md (foundation)
    ↓
    ├─ backend/01-upload-quality-gate.md
    │      ↓
    │      ├─ frontend/01-guided-camera.md
    │      ├─ frontend/02-upload-progress.md
    │      └─ frontend/03-quality-feedback.md
```

## Notes

- Offline queue mechanics are Sprint 07; this sprint keeps upload retry simple (in-session retry + clear failure states) and stores the dedup fingerprint contract Sprint 07 reuses.

## Outcome

Semua 5 task selesai pada 2026-07-29. Backend: migration 0011 (`case_photos` + bucket privat `case-photos` + flag `needs_human_review` di `cases`) diterapkan live; endpoint unggah multipart dengan gerbang kualitas deterministik (ketajaman/luma/resolusi/cakupan hijau → layak/ditolak/ambang/tidak_pasti, maks 3 alasan sederhana, skor mentah hanya log server), dedup sha256 per kasus, EXIF+GPS dihapus sebelum simpan, ≥2 foto diterima → DRAFT→CAPTURED, escalate 3×-gagal → `needs_human_review`; 138 pytest hijau + verifikasi live signed-URL/akses-publik. Frontend: alur foto lengkap (contoh baik/buruk → kamera bingkai panduan dengan fallback galeri → pratinjau → unggah berprogres dengan badge menunggu-jaringan & retry ber-fingerprint → kartu kualitas + tips foto ulang per alasan → "Kirim ke Penyuluh Saja" → auto-lanjut saat 2 foto diterima); 177 vitest hijau, tsc bersih, build staging hijau. Catatan infra: mount supabase-storage diganti named volume (bind mount macOS tanpa xattr → 500).

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/02_PENGAMBILAN_FOTO_KUALITAS.md`](../../../brief/02_PENGAMBILAN_FOTO_KUALITAS.md)
