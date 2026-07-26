# Task 03 — Backlog & Error Metrics (Admin)

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./01-sync-idempotency.md`](./01-sync-idempotency.md) — sync failure signals

## Goal

Endpoint agregat "Kesehatan Sistem" untuk admin: antrean tertunda agregat, tingkat kegagalan, layanan terganggu, dengan threshold indikator (hijau/kuning/merah) per brief 09 §8.1.

## Files to touch

- `apps/backend/router/system_health.py`, `apps/backend/service/system_health.py` — aggregates + threshold evaluation (thresholds from config versions)

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — admin-only endpoint
- `apps/backend/skills/python-logging/SKILL.md` — failure-rate sources

## TODOs

- [ ] Aggregate pending/failed sync items, per-service disruption flags, failure rate (per-minute freshness)
- [ ] Threshold mapping → green/yellow/red status in response
- [ ] Admin role guard; unit tests for threshold mapping

## Done when

Seeded failure data returns correct aggregate counts and status colors; endpoint denies non-admin tokens; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
