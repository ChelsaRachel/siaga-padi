# Task 01 — Review Routes: Queue, Decisions, Revision, Escalation, Follow-up

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-review.md`](./00-schema-review.md) — review schema + ordering contract

## Goal

Endpoint review lengkap: antrean prioritas keselamatan terfilter wilayah binaan, paket bukti kasus (foto + sorotan + AI + kuesioner + rekomendasi + linimasa), keputusan beralasan, minta foto/data tambahan, eskalasi POPT, tindak lanjut, notifikasi status sederhana ke petani, dan nominasi dataset otomatis.

## Files to touch

- `apps/backend/router/review.py`, `apps/backend/service/review.py`, `apps/backend/dto/review.py`
- `apps/backend/service/review_queue.py` — safety-priority ordering (rule-based)
- notification hook: farmer status update in simple language on decision/revision

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — layering + pagination
- `apps/backend/skills/python-auth/SKILL.md` — reviewer scope (binaan / POPT assignment)

## TODOs

- [ ] Queue endpoint: safety ordering + filters (wilayah, alasan, status, waktu); minute-fresh
- [ ] Evidence bundle endpoint incl. evidence highlight maps (reviewer-only)
- [ ] Decision endpoint: konfirmasi/koreksi (official taxonomy + reason wajib) → new review version; AI row untouched; case → `direview`
- [ ] Revision request: guidance text → case `revisi` → farmer notified via Sprint 02 notification path; returning photos re-enter queue with kept priority
- [ ] Escalation to POPT queue; follow-up CRUD (due dates, reschedule, closing note required before `selesai`)
- [ ] Correction + research consent → auto-create dataset nomination flag (consumed Sprint 10); no consent → aggregate feedback only
- [ ] Unit tests: ordering, reason enforcement, version creation, nomination gating

## Done when

Seeded mixed-reason cases order correctly; a correction stores a new version with reason while AI result stays frozen; revision returns the case with kept priority; consent-bearing correction sets `dataset_nominated`; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
