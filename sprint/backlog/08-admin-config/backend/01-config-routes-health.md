# Task 01 — Config Routes + Provider Health/Budget Jobs

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-config.md`](./00-schema-config.md) — config schema + invariants

## Goal

Endpoint katalog konfigurasi (draf/diff/setujui/aktifkan/rollback dengan gerbang orang kedua untuk lingkup kritis), manajemen pengguna/role/assignment, dan pekerjaan terjadwal kesehatan penyedia + pagu belanja yang menggerakkan rute fallback.

## Files to touch

- `apps/backend/router/config.py`, `apps/backend/service/config.py`, `apps/backend/dto/config.py`
- `apps/backend/router/user_admin.py`, `apps/backend/service/user_admin.py` — user list/role/assignment CRUD (admin cannot silently alter expert labels — audit everything)
- `apps/backend/service/provider_health.py` — scheduled hourly checks (more frequent during incidents), budget evaluation, auto route-off/route-back feeding Sprint 07 fallback

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — layering
- `apps/backend/skills/python-auth/SKILL.md` — admin/second-approver guards
- `apps/backend/skills/python-async-performance/SKILL.md` — scheduled job in lifespan task

## TODOs

- [ ] Draft → automated compatibility checks → (critical: second approver ≠ author) → staged activation → rollback endpoint; all with audit diffs
- [ ] Emergency rollback allowed for authorized admin, flagged for post-incident review note
- [ ] User admin: list/filter, role change, assignment wilayah; no shared accounts; deactivation
- [ ] Provider health job: consecutive failures → route off + fallback active; recovery → route back; statuses persisted
- [ ] Budget: ≥80% cap → warn state; 100% → paid provider stopped, free/fallback chain used
- [ ] Retired/deprecated models unselectable after cutoff date
- [ ] Unit tests: second-approver gate, one-active invariant through activation, health transitions, budget states

## Done when

Critical draft cannot activate without a distinct second approver; rollback restores prior version with audit; simulated failing provider flips to `gagal` and marks fallback active, recovering later; budget cap transitions verified; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
