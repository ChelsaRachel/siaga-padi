# Task 01 — CV Inference Integration (Calibrated, Abstain-capable)

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-triage.md`](./00-schema-triage.md) — analysis_results contract

## Goal

Layanan inferensi CV per kasus: panggil model 4-kelas (interface + stub/fixture sampai endpoint model dari Chelsa tersedia), kalibrasi skor → band, deteksi abstain/konflik antar-foto, penalti kualitas foto `ambang`, simpan hasil beku + trigger transisi kasus.

## Files to touch

- `apps/backend/service/cv_inference.py` — model client interface + fixture stub, calibration, conflict/abstain rules
- `apps/backend/service/triage_pipeline.py` — orchestration: photos-ready → inference → persist → case `difoto→diproses(→hasil parsial)`
- `apps/backend/config/` — model endpoint + threshold config (from seeded config version; secrets via env only)

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — service layering
- `apps/backend/skills/python-config/SKILL.md` — provider/threshold config handling
- `apps/backend/skills/python-async-performance/SKILL.md` — non-blocking pipeline execution

## TODOs

- [x] Model client interface + fixture stub returning deterministic candidates for test images
- [x] Calibration → band mapping; below-threshold / out-of-competence → `tidak_yakin`; cross-photo divergence beyond threshold → `konflik` (never force a single label)
- [x] `ambang` photos apply confidence penalty flag
- [x] Persist immutable result with `model_version` + `threshold_version`; abstain/konflik marks case wajib-review (queue consumed in Sprint 06)
- [x] Unit tests: band mapping, abstain rule, conflict rule, penalty

## Done when

Fixture photos produce a stored result with ≤3 candidates + correct band; a conflicting fixture pair yields `konflik` + wajib-review flag; results are immutable; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
