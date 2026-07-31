# Task 01 — Upload Endpoint + Quality Gate

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-photos.md`](./00-schema-photos.md) — case_photos + bucket

## Goal

Endpoint unggah foto per kasus dengan: strip EXIF + normalisasi ukuran, deteksi duplikat via fingerprint, pemeriksaan kualitas (ketajaman, pencahayaan, resolusi, cakupan daun) → status + maks 3 alasan sederhana; borderline diterima dengan penalti; 3× gagal → jalur "perlu review manusia"; 2 foto layak → transisi kasus `difoto` → antre analisis.

## Files to touch

- `apps/backend/router/photos.py`, `apps/backend/service/photos.py`, `apps/backend/dto/photos.py`
- `apps/backend/service/quality_gate.py` — deterministic checks, thresholds read from seeded config version (Sprint 08 formalizes management)

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — upload endpoint + envelope
- `apps/backend/skills/python-async-performance/SKILL.md` — image processing without blocking the loop

## TODOs

- [x] Upload with `Idempotency-Key`/fingerprint: same photo re-sent → same record, no duplicate
- [x] EXIF (incl. GPS) stripped and size normalized before storage write; assert no location metadata persists
- [x] Quality checks map to simple reasons (`buram`, `gelap`, `terlalu_jauh`, `bukan_daun`) — max 3; raw scores logged server-side only
- [x] Borderline → `ambang` accepted with downstream confidence penalty flag; not-a-leaf uncertainty → `tidak_pasti`
- [x] Retake counter per slot; 3rd failure exposes "kirim ke penyuluh" path → case flagged needs-human-review, no auto label
- [x] ≥2 `layak` photos → case transitions `draf→difoto` via the legal transition table; rejected photos retained for UX evaluation, flagged never-for-training
- [x] Unit tests: dedup, reason mapping, 3-fail path, transition trigger

## Done when

Uploading a sharp test image returns `layak`; a blurred one returns `ditolak` with ≤3 reasons; re-upload of identical bytes doesn't duplicate; stored object has no EXIF GPS; after two `layak` photos the case status is `difoto`; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)

- 2026-07-29 — Done-when verified via `tests/test_photos.py` (19 tests): sharp synthetic leaf → `layak`; blurred → `ditolak` with ≤3 reasons incl. `buram`; identical bytes re-upload replays the same record; stored object has empty EXIF (GPS IFD input stripped); two accepted photos advance the case to CAPTURED (`difoto`). Full suite 138 passed. Dedup is CONTENT-addressed (sha256 unique per case) rather than an Idempotency-Key header — a retry of the same photo bytes is inherently a replay; contract pinned in `apps/web/docs/api-spec-photo.md`. Routes are sync `def` so Pillow work runs on the threadpool (event loop never blocked). Extra hardening: penyuluh binaan can read but only owner/assisted-creator may upload (403), invisible cases 404 identically.
