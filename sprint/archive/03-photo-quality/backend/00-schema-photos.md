# Task 00 — Schema: Case Photos + Storage Bucket

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** yes
**Autonomous:** no — one-time schema/storage migration.
**Depends on:**
- [`../../02-case-management/backend/00-schema-case.md`](../../02-case-management/backend/00-schema-case.md) — cases parent table

## Goal

Migration foto kasus + bucket penyimpanan: status kualitas per foto, alasan penolakan, hitungan retake, sidik jari duplikat, dan kebijakan akses.

## Contract delivered

- Table `case_photos`: `id`, `case_id`, `slot_no (1..3)`, `storage_path`, `quality_status ('layak'|'ditolak'|'ambang'|'tidak_pasti')`, `reject_reasons text[] (≤3)`, `retake_count`, `fingerprint (unique per case)`, `quality_config_version`, `exif_stripped bool`, timestamps.
- Storage bucket `case-photos` (normalized versions; full-res only stored under research consent), access via signed URLs only.
- DTO `CasePhotoOut` (camelCase) incl. simple reasons — never raw technical scores.

## Files to touch

- `apps/backend/supabase/migrations/0011_case_photos.sql`
- `apps/backend/models/`, `apps/backend/dto/` — photo model + DTO

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration conventions
- `apps/backend/skills/python-file-naming/SKILL.md` — storage path scheme

## TODOs

- [x] Draft `0011_case_photos.sql` (table + unique(case_id, fingerprint) + indexes)
- [x] Create bucket + policy: owner/penyuluh-scoped signed access, no public reads
- [x] Models + DTOs; migration applied on local stack

## Done when

Migration applies; duplicate fingerprint insert for the same case fails; unauthorized storage read is denied while a signed URL works.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)

- 2026-07-29 — Migration 0011 applied on the local stack; duplicate fingerprint insert fails with 23505; bucket `case-photos` is private (public GET/no-token GET → 400) while a service-minted signed URL returns 200. Escalation flag (`needs_human_review`, `review_reason`) added to `cases` here because FRD §6.5 has no DRAFT→NEEDS_REVIEW edge — Sprint 06 consumes the flag. Infra: supabase-storage's bind mount was swapped for a named Docker volume (macOS host FS lacks xattr support → storage API 500s).
