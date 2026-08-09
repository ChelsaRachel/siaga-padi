# Task 02 — Review Potongan + Diff + Uji Pengambilan

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./01-source-catalog.md`](./01-source-catalog.md) — entry point per source
- [`../backend/01-kb-ingest-retrieval.md`](../backend/01-kb-ingest-retrieval.md) — retrieval-test endpoint

## Goal

Layar kerja domain reviewer: pratinjau potongan (teks + penanda penyakit/tindakan/audiens/risiko), antrean setujui/tolak dengan alasan, penanda kebijakan untuk konten dosis/merek, tampilan banding versi (diff), dan panel uji pengambilan ("Blas Daun fase anakan → potongan apa yang terambil?").

## Files to touch

- `apps/web/src/pages/kb-review/` + `parts/` — queue + chunk preview + decision bar
- `apps/web/src/features/knowledge/review/components/` — tag editor, policy-flag control, diff view, retrieval-test panel
- read-only chunk preview route (linked later from Sprint 05's reference drawer)

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — queue/detail layout, diff presentation
- `apps/web/skills/reactjs-form/SKILL.md` — decision forms
- `apps/web/skills/reactjs-features/SKILL.md` — placement

## TODOs

- [x] Approval queue with per-chunk preview + approve/reject (reason required)
- [x] Policy-flag control prominent when content carries dosage/brand; API rejection surfaced clearly
- [x] Version diff view (draf vs aktif)
- [x] Retrieval-test panel: disease+phase input → ranked ref codes with content preview
- [x] Read-only chunk preview (shareable route) incl. "versi lama — sudah diperbarui/dipensiunkan" label
- [x] Component tests: reason-required gating, flag control, diff render

## Done when

Reviewer approves/rejects chunks with reasons, flags a dosage chunk, compares two versions, and the retrieval test returns expected refs for a seeded disease/phase combo.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)

- 2026-08-08 — Halaman `/pengetahuan/review` (`pages/kb-review/` + `parts/ChunkQueueList` memakai PerfectScrollArea) dan `features/knowledge/review/`: pratinjau potongan (penanda penyakit/fase/tindakan/audiens/risiko + spanduk penanda kebijakan dan label "versi lama"), bar keputusan setujui/tolak dengan alasan WAJIB dan kontrol penanda kebijakan yang terisi otomatis dari `requiredPolicyFlag` (penolakan API ditampilkan apa adanya), tampilan banding versi baris-per-baris, dan panel uji pengambilan yang menampilkan ref code + skor + verdict narasi. Rute baca-saja `/pengetahuan/rujukan/:refCode` (`pages/kb-chunk/`) terbuka untuk semua peran login — target tautan laci rujukan Sprint 05, mendukung `?version=` untuk kutipan historis. Tes: gating alasan, kontrol penanda + penerusan ke API, render diff (10 kasus). 204 vitest hijau, tsc bersih.
