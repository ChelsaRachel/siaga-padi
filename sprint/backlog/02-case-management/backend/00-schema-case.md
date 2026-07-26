# Task 00 — Schema: Farmers, Lahan, Cases, State Machine

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** yes
**Autonomous:** no — one-time schema migration; reviewed once, then static.
**Depends on:**
- [`../../01-auth-roles/backend/00-schema-auth.md`](../../01-auth-roles/backend/00-schema-auth.md) — profiles referenced as case owner/creator

## Goal

Migration domain kasus: lahan, kasus dengan state machine ketat (FRD §6.5–6.6), kunci anti-duplikat, jejak audit transisi, dan RLS kepemilikan.

## Contract delivered

- Table `fields` (lahan): `id`, `owner_profile_id`, `name`, `area_kabupaten`, `area_kecamatan`, `coords (nullable, opt-in only)`, timestamps.
- Table `cases`: `id`, `case_code ('KS-YYYY-NNNNNN')`, `owner_profile_id`, `created_by_profile_id`, `assisted_session_id (nullable)`, `field_id`, `growth_phase ('anakan'|'bunting'|'pengisian_bulir'|…)`, `location_mode ('gps'|'manual_area'|'unknown')`, `status ('draf'|'difoto'|'diproses'|'hasil_siap'|'direview'|'revisi'|'selesai')`, `observed_at`, `idempotency_key (unique)`, `config_version_id (nullable)`, timestamps.
- Table `case_events`: append-only audit of every status transition (`case_id`, `from_status`, `to_status`, `actor_profile_id`, `note`, `created_at`) — the linimasa source.
- DB-level guard (constraint/trigger or service-enforced + tested): only legal transitions per FRD §6.5–6.6; no status skipping.
- RLS: owner reads own cases; penyuluh reads cases in binaan areas; creator recorded separately from owner (assisted).
- DTOs `CaseOut`, `CaseEventOut`, `FieldOut` (camelCase).

## Files to touch

- `apps/backend/supabase/migrations/0010_siaga_case.sql`
- `apps/backend/models/`, `apps/backend/dto/` — case/field/event models + DTOs

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration/model conventions
- `.claude/rules/project-scope.md` — MVP: real DB allowed

## TODOs

- [ ] Draft `0010_siaga_case.sql` (tables, enums, unique idempotency key, indexes on owner/status/area)
- [ ] Encode the legal transition table from FRD §6.5–6.6 (single source, importable by services)
- [ ] `case_events` append-only (no update/delete grants)
- [ ] RLS owner/penyuluh policies verified with test users
- [ ] Models + DTOs; migration applied on local stack

## Done when

Migration applies; inserting an out-of-order transition fails; duplicate `idempotency_key` insert fails; petani test user sees only own cases; penyuluh sees only binaan-area cases.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (event: Task completed)

## Notes

(Append-only.)
