# Task 00 — Schema: Case Photos + Storage Bucket

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
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

- [ ] Draft `0011_case_photos.sql` (table + unique(case_id, fingerprint) + indexes)
- [ ] Create bucket + policy: owner/penyuluh-scoped signed access, no public reads
- [ ] Models + DTOs; migration applied on local stack

## Done when

Migration applies; duplicate fingerprint insert for the same case fails; unauthorized storage read is denied while a signed URL works.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
