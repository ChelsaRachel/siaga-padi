# Task 00 — Schema: Dataset Candidates, Releases, Manifests

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** yes
**Autonomous:** no — one-time schema migration.
**Depends on:**
- [`../../06-review-penyuluh/backend/00-schema-review.md`](../../06-review-penyuluh/backend/00-schema-review.md) — nomination flag source

## Goal

Migration dataset riset: kandidat dengan tautan kasus (bukan salinan publik), kelompok samaran anti-kebocoran, status kurasi + sengketa, dan rilis berversi dengan manifes terkunci.

## Contract delivered

- Table `dataset_candidates`: `id ('KD-YYYY-NNNN')`, `case_link (internal ref, not public copy)`, `origin ('koreksi_review'|'nominasi_sistem')`, `consent_ok bool`, `ai_label`, `human_label`, `quality`, `masked_groups (field_key, device_key, week_key — e.g. 'L-07'/'P-12'/'2026-W30')`, `status ('menunggu'|'disetujui'|'ditolak'|'diperdebatkan')`, `dedup_of (nullable)`, timestamps.
- Table `dataset_releases`: `version ('DS-vX.Y')`, `manifest jsonb (sources, class distribution, license, exclusions)`, `locked_at (immutable after lock)`.
- Table `release_items`: release ↔ candidate links; adjudication log for disputes.
- Invariants: no candidate without `consent_ok`; disputed candidates excluded from release sets; manifest immutable post-lock (revocations recorded as next-release exclusions).
- DTOs `DatasetCandidateOut`, `DatasetReleaseOut` (camelCase; de-identified fields only).

## Files to touch

- `apps/backend/supabase/migrations/0016_dataset.sql`
- `apps/backend/models/`, `apps/backend/dto/`

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration conventions

## TODOs

- [ ] Draft `0016_dataset.sql` per contract (immutable manifest via trigger/no-update grant)
- [ ] Masked-group key generation scheme documented in-migration comment
- [ ] Access limited to data-owner/domain_reviewer roles
- [ ] Models + DTOs; migration applied on local stack

## Done when

Migration applies; inserting a candidate with `consent_ok=false` fails; updating a locked manifest fails; masked-group keys carry no raw identifiers.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
