# Task 00 — Schema: KB Sources, Chunks, Versions

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** yes
**Autonomous:** no — one-time schema migration.

## Goal

Migration basis pengetahuan: sumber berlisensi, potongan rujukan berversi dengan penanda stabil + penanda konten/kebijakan, dan status persetujuan per versi.

## Contract delivered

- Table `kb_sources`: `id`, `title`, `publisher`, `published_date`, `edition_version`, `license_note`, `status ('draf'|'disetujui'|'dipensiunkan')`, `availability_status`, timestamps.
- Table `kb_chunks`: `id`, `ref_code (stable, e.g. 'RUJ-BLAS-004')`, `source_id`, `source_version`, `location (page/section)`, `content`, `disease_tags[]`, `action_type`, `audience ('petani'|'penyuluh')`, `risk ('aman'|'dibatasi')`, `policy_flag (nullable, e.g. 'memuat_dosis')`, `approval_status ('menunggu'|'disetujui'|'ditolak')`, `reject_reason`, `version`, timestamps.
- Rule: **active index = approved + not-retired chunks only**; ref_code stable across versions; new content ⇒ new version row, never overwrite.
- DTOs `KbSourceOut`, `KbChunkOut` (camelCase).

## Files to touch

- `apps/backend/supabase/migrations/0012_knowledge_base.sql`
- `apps/backend/models/`, `apps/backend/dto/`

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration/model conventions

## TODOs

- [ ] Draft `0012_knowledge_base.sql` (tables, unique ref_code+version, indexes on disease_tags/approval)
- [ ] Versioning as new rows (no destructive update); retire keeps history
- [ ] Access: admin/domain_reviewer write; runtime read limited to active-index view
- [ ] Models + DTOs; migration applied on local stack

## Done when

Migration applies; a view/query for "active index" returns only approved, non-retired chunks; updating a chunk creates a new version row with the same `ref_code`.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
