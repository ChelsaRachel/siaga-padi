# Task 01 — KB Ingest (Extract & Chunk) + Retrieval Index

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-kb.md`](./00-schema-kb.md) — sources/chunks tables

## Goal

Pipeline ingest: dokumen terdaftar → ekstraksi teks → pemecahan jadi potongan (dengan lokasi halaman/bagian) → antrean review; plus indeks pengambilan (disease/phase/audience filter) dan endpoint uji pengambilan.

## Files to touch

- `apps/backend/service/kb_ingest.py` — extract + chunk on source registration
- `apps/backend/service/kb_retrieval.py` — retrieval over active index (query: disease, phase, audience, action type)
- `apps/backend/router/kb_retrieval.py` — internal retrieval endpoint + `/kb/retrieval-test` for admin panel

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — endpoint conventions
- `apps/backend/skills/python-async-performance/SKILL.md` — background ingest job

## TODOs

- [ ] Ingest PDF/text → chunks with location metadata; chunks land in `menunggu` (never auto-approved)
- [ ] Retrieval reads **only** the active index; policy-flagged chunks returned with flag so callers can restrict narration (Sprint 05 safety checker consumes this)
- [ ] Retrieval-test endpoint: given disease+phase → ranked chunk refs (admin/reviewer only)
- [ ] Retrieval log stores ref codes only (not full sensitive request contents)
- [ ] Unit tests: draft never retrievable; policy flag propagated; retrieval-test ranking deterministic

## Done when

Registering a sample public document yields pending chunks; approving some makes exactly those retrievable; retrieval-test for "Blas Daun, anakan" returns the approved Blas chunks with flags intact; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
