# Task 00 — Schema: Config Versions, Approvals, Provider Health, Budget

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** yes
**Autonomous:** no — one-time schema migration + seed of current implicit config.

## Goal

Migration konfigurasi terkendali: versi per lingkup dengan siklus draf→ditinjau→aktif→diarsip, persetujuan orang kedua untuk lingkup kritis, log kesehatan penyedia, dan pagu belanja.

## Contract delivered

- Table `config_versions`: `id`, `scope ('cv_model'|'ai_provider'|'thresholds'|'kb_version'|'security_rules')`, `version_no`, `payload jsonb (non-secret values only; secrets stay in env)`, `status ('draf'|'ditinjau'|'aktif'|'diarsip')`, `is_critical bool`, `created_by`, `second_approver_id (required when critical)`, `activated_at`, `rolled_back_from (nullable)`, timestamps. **Invariant: exactly one `aktif` per scope** (partial unique index).
- Table `config_audit`: append-only diff log per change.
- Table `provider_health`: `provider`, `checked_at`, `status ('sehat'|'lambat'|'gagal')`, `latency_ms`, `consecutive_failures`.
- Table `provider_budget`: `provider`, `month`, `spend_estimate`, `cap`, `state ('normal'|'warn80'|'capped')`.
- Seed: current implicit configs used by Sprints 03/05 (quality thresholds, confidence thresholds, provider chain, KB version) as `aktif` v1 rows — from now on services read these.
- DTOs (camelCase) with secret masking guaranteed at serialization.

## Files to touch

- `apps/backend/supabase/migrations/0015_config.sql`
- `apps/backend/models/`, `apps/backend/dto/`; seed script

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration conventions
- `apps/backend/skills/python-config/SKILL.md` — env/secret separation

## TODOs

- [ ] Draft `0015_config.sql` per contract (one-active-per-scope index; append-only audit)
- [ ] Seed v1 aktif configs matching what Sprints 03/05 currently read; switch those services to read from `config_versions`
- [ ] DTO masking: secret-typed keys never serialized
- [ ] Migration applied on local stack

## Done when

Migration applies; inserting a second `aktif` row for a scope fails; Sprint 03/05 services read thresholds from the seeded rows; secrets absent from all API payloads.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
