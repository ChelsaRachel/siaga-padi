# Task 02 — Pembangun Rilis Dataset + Manifes

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./01-candidate-review.md`](./01-candidate-review.md) — approved candidates feed releases

## Goal

Layar penyusunan rilis: pilih kandidat disetujui → ringkasan rilis (jumlah per kelas, sebaran kelompok, pengecualian) → kunci manifes (versi, lisensi, sumber, pengecualian) yang setelah rilis menjadi baca-saja.

## Files to touch

- `apps/web/src/pages/dataset-release/` + `parts/` — release composer + manifest view
- `apps/web/src/features/dataset/components/` — distribution summary table, manifest document view (locked state)

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — summary tables + document view
- `apps/web/skills/reactjs-features/SKILL.md` — placement

## TODOs

- [ ] Compose release from approved candidates; distribution + masked-group spread summary before lock
- [ ] Lock confirmation with irreversibility warning; locked manifest rendered read-only afterwards
- [ ] Exclusions (e.g. consent revocations) visible in the manifest view
- [ ] Tests: lock-state rendering, summary computation display

## Done when

A release composed from seeded approved candidates locks with a manifest (e.g. `DS-v0.3`) that renders read-only, with distributions and exclusions shown.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
