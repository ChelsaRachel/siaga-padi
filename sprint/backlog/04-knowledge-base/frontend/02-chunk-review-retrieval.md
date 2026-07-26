# Task 02 — Review Potongan + Diff + Uji Pengambilan

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
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

- [ ] Approval queue with per-chunk preview + approve/reject (reason required)
- [ ] Policy-flag control prominent when content carries dosage/brand; API rejection surfaced clearly
- [ ] Version diff view (draf vs aktif)
- [ ] Retrieval-test panel: disease+phase input → ranked ref codes with content preview
- [ ] Read-only chunk preview (shareable route) incl. "versi lama — sudah diperbarui/dipensiunkan" label
- [ ] Component tests: reason-required gating, flag control, diff render

## Done when

Reviewer approves/rejects chunks with reasons, flags a dosage chunk, compares two versions, and the retrieval test returns expected refs for a seeded disease/phase combo.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
