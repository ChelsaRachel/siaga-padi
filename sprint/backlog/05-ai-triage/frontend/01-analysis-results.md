# Task 01 — Hasil Indikasi Awal (Kartu Petani + Panel Teknis)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-cv-inference.md`](../backend/01-cv-inference.md) — analysis result DTOs (role-split)

## Goal

Layar hasil analisis dua kedalaman: kartu indikasi petani (bahasa awam + band + disclaimer "bukan diagnosis final") dan panel teknis penyuluh (3 kandidat + skor + kualitas + versi model), dengan badge "Tidak Yakin"/"Konflik" dan penjelasan jujur; layar progres bertahap selama analisis berjalan.

## Files to touch

- `apps/web/src/pages/case-analysis/` + `parts/` — staged progress → result reveal
- `apps/web/src/features/case/triage/components/` — farmer indication card, technical panel (role-gated), abstain/conflict badges
- `apps/web/src/services/triage.ts` — analysis endpoints client

## Skills to consult

- `apps/web/skills/reactjs-features/SKILL.md` — placement
- `apps/web/skills/reactjs-data-display/SKILL.md` — result card + detail panel
- `apps/web/skills/reactjs-auth-guard/SKILL.md` — role-gated technical panel

## TODOs

- [ ] Staged progress screen (named stages) polling case status; replaces Sprint 03's auto-continue placeholder
- [ ] Farmer card: indication + band + disclaimer; abstain → honest "Tidak Yakin" copy + auto-review note + safe generic actions
- [ ] Technical panel (penyuluh only): candidates + exact scores + photo quality + model version; "Buka di Review" link (Sprint 06 route stub)
- [ ] Conflict badge with per-photo candidate summary; evidence highlight maps NOT rendered for petani (reviewer-only, Sprint 06)
- [ ] Tests: role gating (petani never sees scores), abstain/conflict rendering

## Done when

Petani view shows only simple indication + band; penyuluh view adds scores/model version; abstain fixture shows "Tidak Yakin" with review note; staged progress appears while pipeline runs.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
