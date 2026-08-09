# Task 02 — Questionnaire Engine (Bank Tervalidasi, ≤5 Pertanyaan)

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-triage.md`](./00-schema-triage.md) — question_bank + case_answers
- [`./01-cv-inference.md`](./01-cv-inference.md) — question selection keyed off analysis result

## Goal

Pemilih pertanyaan (maks 5, dari bank tervalidasi, berdasarkan hasil foto + fase) dan penerima jawaban (Ya/Tidak/Tidak Tahu) dengan aturan urgensi — penanda urgensi menambah konteks/eskalasi, tidak pernah mengubah label analisis.

## Files to touch

- `apps/backend/service/questionnaire.py` — selection rules + urgency evaluation
- `apps/backend/router/questionnaire.py`, `apps/backend/dto/questionnaire.py` — get-questions / submit-answers endpoints

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — endpoint conventions

## TODOs

- [x] Selection: trigger_rules(disease candidates + phase) → ≤5 approved questions, ordered; abstain cases still get questions (context for review)
- [x] Submit answers (assisted attribution recorded); "tidak_tahu" adds uncertainty note only
- [x] Urgency rules → `urgency_flag` on case (raises review priority; never mutates analysis label)
- [x] Questions answered → pipeline proceeds to recommendation stage
- [x] Unit tests: selection determinism, ≤5 cap, urgency evaluation, label-immutability

## Done when

A Blas-candidate case at fase anakan gets the expected seeded questions; risky answer combo sets `urgency_flag` without touching the analysis result; answers recorded with the correct filler identity; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
