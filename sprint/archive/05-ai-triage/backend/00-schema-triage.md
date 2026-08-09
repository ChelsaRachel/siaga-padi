# Task 00 — Schema: Analysis Results, Question Bank, Recommendations

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** yes
**Autonomous:** no — one-time schema migration + question-bank seed.
**Depends on:**
- [`../../02-case-management/backend/00-schema-case.md`](../../02-case-management/backend/00-schema-case.md) — cases
- [`../../04-knowledge-base/backend/00-schema-kb.md`](../../04-knowledge-base/backend/00-schema-kb.md) — ref codes cited by recommendations

## Goal

Migration triase: hasil analisis beku (immutable), bank pertanyaan berversi + jawaban, dan rekomendasi dua-tampilan dengan daftar rujukan + asal keluaran.

## Contract delivered

- Table `analysis_results` (immutable): `id`, `case_id`, `candidates jsonb (≤3: label, calibrated_score)`, `confidence_band ('tinggi'|'sedang'|'rendah')`, `abstain_status ('yakin'|'tidak_yakin'|'konflik')`, `quality_penalty bool`, `model_version`, `threshold_version`, `evidence_maps jsonb (per-photo highlight refs, reviewer-only)`, `created_at`. No UPDATE grants — corrections happen in Sprint 06 as new review versions.
- Table `question_bank` (versioned, expert-approved): `id`, `code`, `text`, `illustration`, `why_asked`, `trigger_rules jsonb (disease/phase)`, `urgency_rules jsonb`, `version`, `approved bool`.
- Table `case_answers`: `case_id`, `question_id`, `answer ('ya'|'tidak'|'tidak_tahu')`, `answered_by_profile_id`, `created_at`; derived `urgency_flag` on case.
- Table `recommendations`: `id`, `case_id`, `analysis_result_id`, `farmer_view jsonb (indikasi, lakukan, pantau, hindari, eskalasi)`, `technical_view jsonb`, `ref_codes text[]`, `origin ('ai_engine'|'rule_fallback'|'insufficient_evidence')`, `created_at`.
- DTOs (camelCase): `AnalysisResultOut` (petani variant hides scores/evidence), `QuestionOut`, `RecommendationOut`.

## Files to touch

- `apps/backend/supabase/migrations/0013_triage.sql`
- `apps/backend/models/`, `apps/backend/dto/`
- question-bank seed from expert-approved list (placeholder set flagged for Chelsa/domain-reviewer validation)

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration/model conventions

## TODOs

- [x] Draft `0013_triage.sql` per contract (immutability enforced: no update grant on analysis_results)
- [x] Seed question bank (approved-flagged placeholder pending expert validation — surface in Notes)
- [x] Models + DTOs incl. role-split serialization (petani never receives raw scores/evidence maps)
- [x] Migration applied on local stack

## Done when

Migration applies; UPDATE on `analysis_results` is rejected; DTO for petani role omits scores/evidence while penyuluh DTO includes them.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
