# Task 01 — KB Ingest (Extract & Chunk) + Retrieval Index

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
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

- [x] Ingest PDF/text → chunks with location metadata; chunks land in `menunggu` (never auto-approved)
- [x] Retrieval reads **only** the active index; policy-flagged chunks returned with flag so callers can restrict narration (Sprint 05 safety checker consumes this)
- [x] Retrieval-test endpoint: given disease+phase → ranked chunk refs (admin/reviewer only)
- [x] Retrieval log stores ref codes only (not full sensitive request contents)
- [x] Unit tests: draft never retrievable; policy flag propagated; retrieval-test ranking deterministic

## Done when

Registering a sample public document yields pending chunks; approving some makes exactly those retrievable; retrieval-test for "Blas Daun, anakan" returns the approved Blas chunks with flags intact; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)

- 2026-08-08 — `service/kb_ingest.py` (ekstraksi PDF per halaman via pypdf / markdown per judul → `Hal. N` atau `§ Judul`, pemecahan deterministik ~700 karakter, auto-tag penyakit/fase/tindakan + saran penanda kebijakan, ref code stabil `RUJ-<TOKEN>-NNN` lewat `RefCodeAllocator` sehingga satu ingest tidak pernah membagikan kode yang sama) dan `service/kb_retrieval.py` + `router/kb_retrieval.py` (`POST /kb/retrieval` untuk mesin rekomendasi via `X-Internal-Token`, `POST /kb/retrieval-test` untuk admin/reviewer). Ingest TIDAK PERNAH menyetujui: semua potongan mendarat `menunggu`. Pemeringkatan deterministik (penyakit 100 / fase 30 / tindakan 20 / audiens 10 / potongan umum 5, tie-break ref code); query `audience: petani` tidak pernah memunculkan materi khusus penyuluh; `policyFlag` + `narratable` ikut di setiap hit. Log pengambilan hanya menyimpan ref code + faset. 35 pytest (19 ingest, 16 retrieval) hijau.
