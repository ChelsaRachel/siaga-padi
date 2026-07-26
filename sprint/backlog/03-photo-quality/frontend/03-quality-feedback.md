# Task 03 — Kartu Hasil Kualitas & Panduan Foto Ulang

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./02-upload-progress.md`](./02-upload-progress.md) — quality result arrives after upload

## Goal

Kartu hasil kualitas per foto (layak/tidak + maks 3 alasan sederhana), panel tips foto ulang dengan contoh sebelum/sesudah sesuai alasan, dan tombol "Kirim ke Penyuluh Saja" setelah 3× gagal — lalu lanjut otomatis ke analisis saat minimum foto layak terpenuhi.

## Files to touch

- `apps/web/src/features/case/photo/components/` — quality card, retake tips panel, escalation button
- `apps/web/src/pages/case-photo/parts/` — result step wiring (rejected → camera with relevant tips)

## Skills to consult

- `apps/web/skills/reactjs-features/SKILL.md` — placement
- `apps/web/skills/reactjs-data-display/SKILL.md` — status card pattern

## TODOs

- [ ] Quality card per photo: simple reasons only (no technical scores); `ambang` shows accepted-with-warning copy
- [ ] Rejected → back to camera preloaded with reason-specific tips + before/after example
- [ ] 3rd failure reveals "Kirim ke Penyuluh Saja" → confirmation → case marked needs-human-review; honest copy (no auto-diagnosis)
- [ ] All-photos-layak → auto-continue to analysis route (Sprint 05 placeholder until then)
- [ ] Tests: reason→tips mapping, 3-fail reveal, auto-continue condition

## Done when

A rejected photo loops back to camera with matching tips; after three failures the escalation path marks the case for human review; two accepted photos auto-advance the flow.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
