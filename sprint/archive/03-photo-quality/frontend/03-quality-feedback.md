# Task 03 — Kartu Hasil Kualitas & Panduan Foto Ulang

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
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

- [x] Quality card per photo: simple reasons only (no technical scores); `ambang` shows accepted-with-warning copy
- [x] Rejected → back to camera preloaded with reason-specific tips + before/after example
- [x] 3rd failure reveals "Kirim ke Penyuluh Saja" → confirmation → case marked needs-human-review; honest copy (no auto-diagnosis)
- [x] All-photos-layak → auto-continue to analysis route (Sprint 05 placeholder until then)
- [x] Tests: reason→tips mapping, 3-fail reveal, auto-continue condition

## Done when

A rejected photo loops back to camera with matching tips; after three failures the escalation path marks the case for human review; two accepted photos auto-advance the flow.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)

- 2026-08-03 — Audit follow-up: auto-continue derived its navigation from `acceptedCount`/`needsHumanReview`, which `syncFromServer` also sets — so reopening an already-complete case bounced the user to the detail page before any retake was possible (a trap for Sprint 06's "perlu foto ulang" entry, whose `reviewerNote` prop still has no producer). Navigation now keys off a new `hasJustCompleted` flag that ONLY a live upload/escalate sets; hydration never arms it. Covered by 6 new store tests.
- 2026-07-29 — Delivered as `QualityResultCard` (status badge + max-3 simple reasons, `ambang` warning copy, guarded against technical-score leakage), `RetakeTipsPanel` (reason→tip + before/after examples, back-to-camera), `EscalateSection` (AlertDialog confirm, honest no-auto-diagnosis copy), wired in `CasePhotoPage` (rejected → camera preloaded with tips; `needsHumanReview`/2-accepted → navigate to `/kasus/:caseId`, the analysis placeholder until Sprint 05). Done-when verified: `QualityFeedback.test.tsx` (reason→tips mapping, 3-fail reveal + confirm) and `usePhotoFlowStore.test.ts` (`selectShouldAutoContinue` fires exactly at 2 accepted; escalate flags needs-human-review). `photo-labels.test.ts` additionally asserts the copy never contains scoring vocabulary.
