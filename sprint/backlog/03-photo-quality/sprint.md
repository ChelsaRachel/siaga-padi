# Sprint 03 — Photo & Quality

**Status:** 📋 Planned
**Created At:** 2026-07-25
**Started At:** -
**Completed At:** -

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

(Filled in on archive.)

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/02_PENGAMBILAN_FOTO_KUALITAS.md`](../../../brief/02_PENGAMBILAN_FOTO_KUALITAS.md)
