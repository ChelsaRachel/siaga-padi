# Task 02 — Unggah dengan Progres & Coba Ulang

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./01-guided-camera.md`](./01-guided-camera.md) — photos come from the capture flow

## Goal

Pengiriman foto dengan bilah progres per foto, badge "menunggu jaringan" saat koneksi putus (foto tersimpan sementara), tombol coba lagi saat gagal, dan anti-duplikat di klien (fingerprint sebelum kirim).

## Files to touch

- `apps/web/src/features/case/photo/components/` — progress bar, pending badge, retry button
- `apps/web/src/services/photos.ts` — upload client with progress events + client-side fingerprint
- `apps/web/src/stores/` — per-photo upload state (menunggu/mengirim/terkirim/gagal)

## Skills to consult

- `apps/web/skills/reactjs-service/SKILL.md` — upload client conventions
- `apps/web/skills/reactjs-state-management/SKILL.md` — upload queue state

## TODOs

- [x] Per-photo progress; connection drop → local temp keep + "menunggu jaringan" badge (full offline queue arrives Sprint 07 — keep the state shape compatible)
- [x] Retry button re-sends with the same fingerprint; server dedup means no double photo
- [x] Status copy never claims server receipt before confirmation
- [x] Tests: retry reuses fingerprint; state transitions per upload outcome

## Done when

Simulated network failure shows the pending badge without losing the photo; retry completes the upload; the photo appears exactly once on the case.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)

- 2026-07-29 — Delivered as `services/photos.service.ts` (uploadRequest + progress events), `features/case/photo/utils/fingerprint.ts` (sha256, same-bytes contract), `store/usePhotoFlowStore.ts` (per-slot menunggu_jaringan/mengirim/terkirim/gagal — shape kept Sprint 07-compatible), `components/UploadProgressCard.tsx`, plus an `online` listener in the page for auto re-send. Done-when verified in `usePhotoFlowStore.test.ts`: offline failure → `menunggu_jaringan` with the blob kept; retry re-sends the SAME blob/fingerprint and lands `terkirim`; identical bytes blocked client-side (and replayed server-side) so the photo appears exactly once. Note: the task named `services/photos.ts`; implemented as `photos.service.ts` per the mandatory `{module}.service.ts` naming convention (same deviation documented in Sprint 02's cases.service.ts).
