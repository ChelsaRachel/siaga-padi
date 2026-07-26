# Task 00 — Schema: Case Reviews (Versioned), Follow-ups, Escalations

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** yes
**Autonomous:** no — one-time schema migration.
**Depends on:**
- [`../../05-ai-triage/backend/00-schema-triage.md`](../../05-ai-triage/backend/00-schema-triage.md) — frozen analysis results referenced by reviews

## Goal

Migration review: versi review manusia berdampingan dengan hasil AI beku, alasan wajib, tindak lanjut berjenjang, eskalasi POPT, dan penanda nominasi dataset.

## Contract delivered

- Table `case_reviews` (append-only versions): `id`, `case_id`, `analysis_result_id (frozen ref)`, `decision ('konfirmasi'|'koreksi'|'revisi'|'eskalasi')`, `corrected_label (taksonomi resmi + 'lainnya_tidak_diketahui')`, `reason_code (wajib, dari daftar)`, `reason_note`, `reviewer_profile_id`, `internal_note (never exposed to petani)`, `dataset_nominated bool`, `version_no`, `created_at`.
- Table `follow_ups`: `id`, `case_id`, `review_id`, `kind ('pantau'|'kunjungan'|'eskalasi_popt')`, `due_date`, `status ('direncanakan'|'dilakukan'|'selesai'|'dijadwal_ulang')`, `closing_note (wajib sebelum kasus selesai)`, timestamps.
- Table `escalations`: `case_id`, `summary`, `assigned_reviewer_id`, `status`.
- Queue ordering contract: priority = safety reasons (abstain > urgency > conflict > farmer request) then queue age; revision-returned cases keep prior priority.
- DTOs (camelCase): `ReviewOut`, `FollowUpOut`; farmer-facing status DTO exposes simple-language status only.

## Files to touch

- `apps/backend/supabase/migrations/0014_review.sql`
- `apps/backend/models/`, `apps/backend/dto/`

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration conventions

## TODOs

- [ ] Draft `0014_review.sql` per contract (append-only reviews; no update on decision rows)
- [ ] Constraint: `koreksi` requires `corrected_label` + `reason_code`; label restricted to official taxonomy enum
- [ ] RLS: reviewer roles only; internal notes excluded from farmer-readable views
- [ ] Models + DTOs; migration applied on local stack

## Done when

Migration applies; a second decision on the same case creates version 2 with version 1 intact; correction without reason is rejected at DB/API layer; farmer view cannot select internal notes.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
