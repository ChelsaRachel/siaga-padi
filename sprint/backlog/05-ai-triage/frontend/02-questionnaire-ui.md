# Task 02 — Kuesioner Konteks (Satu Pertanyaan per Layar)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/02-questionnaire-engine.md`](../backend/02-questionnaire-engine.md) — question/answer endpoints
- [`./01-analysis-results.md`](./01-analysis-results.md) — entry after indication screen

## Goal

Kuesioner maks 5 pertanyaan, satu per layar: tombol besar Ya / Tidak / Tidak Tahu, ilustrasi opsional, keterangan "mengapa ditanya", indikator "2 dari 4" — jawaban tidak pernah dipaksa; mode pendampingan mencatat pengisi.

## Files to touch

- `apps/web/src/pages/case-questionnaire/` + `parts/` — stepper flow
- `apps/web/src/features/case/triage/components/` — question card, answer buttons, progress dots
- `apps/web/src/services/triage.ts` — extend with answers submission

## Skills to consult

- `apps/web/skills/reactjs-form/SKILL.md` — stepper interaction
- `apps/web/skills/reactjs-responsive/SKILL.md` — large touch targets

## TODOs

- [ ] One-question-per-screen stepper with progress indicator + "mengapa ditanya" note
- [ ] "Tidak Tahu" always available; back navigation preserves answers
- [ ] Submit → auto-continue to recommendation screen (staged progress while composing)
- [ ] Assisted mode: filler identity from assisted store shown subtly
- [ ] Tests: answer persistence across navigation, completion submit

## Done when

A seeded 4-question flow completes with mixed answers (incl. Tidak Tahu) and lands on the recommendation progress screen; answers recorded server-side with correct filler.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
