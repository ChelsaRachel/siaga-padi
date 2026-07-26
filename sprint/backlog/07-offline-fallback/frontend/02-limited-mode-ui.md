# Task 02 — Mode Terbatas UI (Badge + Penjelasan)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/02-rule-fallback.md`](../backend/02-rule-fallback.md) — `origin='rule_fallback'` recommendations

## Goal

Aktivasi penuh badge "mode terbatas" pada kartu hasil (slot dari Sprint 05): penjelasan layanan mana yang gagal, kartu arahan aman generik + ajakan hubungi penyuluh, dan indikasi bahwa kasus dapat diproses ulang penuh saat layanan pulih.

## Files to touch

- `apps/web/src/features/case/triage/components/` — limited-mode badge + explanation sheet (fills the Sprint 05 slot)
- `apps/web/src/features/offline/components/` — degraded-service notice reused across screens

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — badge/notice patterns
- `apps/web/skills/reactjs-error-handling/SKILL.md` — honest degraded-state copy

## TODOs

- [ ] Badge on result cards when `origin='rule_fallback'`; tap → explanation of which service failed and what it means
- [ ] Safe-guidance card emphasizes contacting penyuluh; no fabricated certainty
- [ ] Reprocessed case replaces limited view with full recommendation and notes the update time
- [ ] Tests: badge render per origin, reprocess replacement

## Done when

A rule-fallback fixture case shows the badge + explanation; after reprocess the full recommendation appears with updated timestamp.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
