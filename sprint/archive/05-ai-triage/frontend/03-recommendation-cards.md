# Task 03 — Kartu Rekomendasi + Laci Rujukan (Hasil Kasus FR-009)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/03-recommendation-engine.md`](../backend/03-recommendation-engine.md) — recommendation DTOs
- [`./02-questionnaire-ui.md`](./02-questionnaire-ui.md) — flow ordering

## Goal

Layar hasil akhir kasus (mengisi slot Sprint 02): kartu aksi petani (indikasi, lakukan sekarang, pantau, hindari, kapan hubungi penyuluh), kartu teknis penyuluh (kandidat, ketidakpastian, kutipan bukti, penanda aturan), laci sumber rujukan yang menaut pratinjau potongan KB, status review, tombol "Hubungi Penyuluh", dan waktu pembaruan terakhir.

## Files to touch

- `apps/web/src/pages/case-detail/parts/` — fill the Sprint 02 result-card slot
- `apps/web/src/features/case/triage/components/` — farmer action cards, technical card, reference drawer, review-status indicator
- modal kontak penyuluh wilayah ("Hubungi Penyuluh", context: case + area)

## Skills to consult

- `apps/web/skills/reactjs-features/SKILL.md` — placement
- `apps/web/skills/reactjs-data-display/SKILL.md` — stacked cards + drawer
- `apps/web/skills/reactjs-error-handling/SKILL.md` — insufficient-evidence / limited-mode states

## TODOs

- [x] Farmer stacked cards (numbered "lakukan sekarang", pantau, hindari, eskalasi) — no jargon, no dosage/brand ever rendered
- [x] Reference drawer: per-suggestion ref codes → read-only KB chunk preview (Sprint 04 route); does not dominate the screen
- [x] Technical card for penyuluh incl. uncertainty emphasis on low band; `insufficient_evidence` state honest + safe generic actions
- [x] Review-status indicator (menunggu/direview/perlu foto ulang) + "Hubungi Penyuluh" modal + last-updated time
- [x] `origin='rule_fallback'` renders the limited-mode badge slot (full behavior Sprint 07)
- [x] Tests: ref drawer mapping, role split, edge states

## Done when

A completed fixture case shows farmer cards with working reference drawer and review status; low-band and insufficient-evidence fixtures render uncertainty-first content; penyuluh sees the technical card.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
