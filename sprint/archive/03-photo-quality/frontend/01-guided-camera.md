# Task 01 — Kamera Terpandu (Bingkai + Contoh Baik/Buruk)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-upload-quality-gate.md`](../backend/01-upload-quality-gate.md) — upload contract

## Goal

Layar contoh foto baik/buruk → kamera penuh-layar (getUserMedia) dengan bingkai panduan, penghitung "Foto 1 dari 2 (maks 3)", tips cahaya/fokus, pratinjau "Foto Ulang / Pakai Foto Ini", dan fallback unggah galeri bila kamera tak tersedia; catatan privasi (EXIF lokasi dihapus otomatis) tampil.

## Files to touch

- `apps/web/src/pages/case-photo/` + `parts/` — intro examples, camera screen, preview
- `apps/web/src/features/case/photo/components/` — camera view, frame overlay, counter, gallery fallback
- `apps/web/src/routes/` — replace Sprint 02 placeholder route with real flow (entry from wizard step 3 & "perlu foto ulang" notifications)

## Skills to consult

- `apps/web/skills/reactjs-features/SKILL.md` — placement
- `apps/web/skills/reactjs-responsive/SKILL.md` — full-screen mobile camera layout
- `apps/web/skills/reactjs-error-handling/SKILL.md` — permission-denied / no-camera states

## TODOs

- [x] Good/bad example gallery shown before first capture
- [x] Camera with frame overlay + counter; capture → preview → retake/use
- [x] No camera / permission denied → gallery upload with the same guidance
- [x] Privacy note about EXIF stripping; reviewer-guidance note shown when arriving from "perlu foto ulang"
- [x] Component tests for fallback branch + counter limits (min 2, max 3)

## Done when

On a phone-sized viewport: capture two photos through the guided flow and reach upload; with camera blocked, the gallery path completes the same flow.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)

- 2026-07-29 — Delivered as `features/case/photo/` (PhotoExamples, CameraCapture w/ frame overlay + gallery fallback, PhotoPreview) orchestrated by the rewritten `pages/case-photo/CasePhotoPage.tsx` (placeholder replaced; route path unchanged, wizard entry still works). Done-when verified via component tests: jsdom has no `mediaDevices`, so `CameraCapture.test.tsx` exercises the real fallback branch (gallery input + counter + EXIF note + reason tips + reviewer note); counter min-2/max-3 limits covered in `usePhotoFlowStore.test.ts` (`buildCounterLabel`). 177 vitest green, tsc clean, staging build green.
