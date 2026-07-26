# Task 01 — Upload Endpoint + Quality Gate

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
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

- [ ] Upload with `Idempotency-Key`/fingerprint: same photo re-sent → same record, no duplicate
- [ ] EXIF (incl. GPS) stripped and size normalized before storage write; assert no location metadata persists
- [ ] Quality checks map to simple reasons (`buram`, `gelap`, `terlalu_jauh`, `bukan_daun`) — max 3; raw scores logged server-side only
- [ ] Borderline → `ambang` accepted with downstream confidence penalty flag; not-a-leaf uncertainty → `tidak_pasti`
- [ ] Retake counter per slot; 3rd failure exposes "kirim ke penyuluh" path → case flagged needs-human-review, no auto label
- [ ] ≥2 `layak` photos → case transitions `draf→difoto` via the legal transition table; rejected photos retained for UX evaluation, flagged never-for-training
- [ ] Unit tests: dedup, reason mapping, 3-fail path, transition trigger

## Done when

Uploading a sharp test image returns `layak`; a blurred one returns `ditolak` with ≤3 reasons; re-upload of identical bytes doesn't duplicate; stored object has no EXIF GPS; after two `layak` photos the case status is `difoto`; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
