# Task 02 — Unggah dengan Progres & Coba Ulang

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
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

- [ ] Per-photo progress; connection drop → local temp keep + "menunggu jaringan" badge (full offline queue arrives Sprint 07 — keep the state shape compatible)
- [ ] Retry button re-sends with the same fingerprint; server dedup means no double photo
- [ ] Status copy never claims server receipt before confirmation
- [ ] Tests: retry reuses fingerprint; state transitions per upload outcome

## Done when

Simulated network failure shows the pending badge without losing the photo; retry completes the upload; the photo appears exactly once on the case.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
