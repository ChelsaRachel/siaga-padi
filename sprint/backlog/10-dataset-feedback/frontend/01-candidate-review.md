# Task 01 — Antrean Kandidat + Tinjauan Gambar & Label

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-dataset-pipeline-routes.md`](../backend/01-dataset-pipeline-routes.md) — queue + decision endpoints

## Goal

Halaman "Antrean Dataset" untuk pemilik data & domain reviewer: daftar kandidat terfilter (asal, consent, label, status, kelompok samaran), peringatan duplikat dengan panel banding dua gambar, dan panel keputusan (Setujui / Tolak / Label Ulang / Sengketa) dengan riwayat reviewer.

## Files to touch

- `apps/web/src/pages/dataset-queue/` + `parts/` — queue + review panel
- `apps/web/src/features/dataset/components/` — candidate table, dup compare panel, decision panel, label editor
- `apps/web/src/services/dataset.ts`; `src/routes/` + `src/config/menu/` — admin/data menu entry

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — queue + compare layout
- `apps/web/skills/reactjs-form/SKILL.md` — decision controls
- `apps/web/skills/reactjs-features/SKILL.md` — placement (`features/dataset/`)

## TODOs

- [ ] Filterable candidate queue (default: menunggu tinjau); daily-freshness indicator
- [ ] Candidate view: de-identified image, AI vs corrected label, reviewer history, masked group keys
- [ ] Dup warning → side-by-side compare → reject or mark variant
- [ ] Decisions incl. dispute path; disputed status visibly excludes from release candidates
- [ ] Tests: filter behavior, decision state transitions, compare panel wiring

## Done when

Skenario 10.1 brief 07 (kurasi mingguan) can be walked through on seeded data: dups compared, candidates approved/relabeled/disputed, statuses correct.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
