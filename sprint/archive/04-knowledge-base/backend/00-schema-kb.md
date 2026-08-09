# Task 00 — Schema: KB Sources, Chunks, Versions

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** yes
**Autonomous:** no — one-time schema migration.

## Goal

Migration basis pengetahuan: sumber berlisensi, potongan rujukan berversi dengan penanda stabil + penanda konten/kebijakan, dan status persetujuan per versi.

## Contract delivered

- Table `kb_sources`: `id`, `title`, `publisher`, `published_date`, `edition_version`, `license_note`, `status ('draf'|'disetujui'|'dipensiunkan')`, `availability_status`, timestamps.
- Table `kb_chunks`: `id`, `ref_code (stable, e.g. 'RUJ-BLAS-004')`, `source_id`, `source_version`, `location (page/section)`, `content`, `disease_tags[]`, `action_type`, `audience ('petani'|'penyuluh')`, `risk ('aman'|'dibatasi')`, `policy_flag (nullable, e.g. 'memuat_dosis')`, `approval_status ('menunggu'|'disetujui'|'ditolak')`, `reject_reason`, `version`, timestamps.
- Rule: **active index = approved + not-retired chunks only**; ref_code stable across versions; new content ⇒ new version row, never overwrite.
- DTOs `KbSourceOut`, `KbChunkOut` (camelCase).

## Files to touch

- `apps/backend/supabase/migrations/0012_knowledge_base.sql`
- `apps/backend/models/`, `apps/backend/dto/`

## Skills to consult

- `apps/backend/skills/python-data/SKILL.md` — migration/model conventions

## TODOs

- [x] Draft `0012_knowledge_base.sql` (tables, unique ref_code+version, indexes on disease_tags/approval)
- [x] Versioning as new rows (no destructive update); retire keeps history
- [x] Access: admin/domain_reviewer write; runtime read limited to active-index view
- [x] Models + DTOs; migration applied on local stack

## Done when

Migration applies; a view/query for "active index" returns only approved, non-retired chunks; updating a chunk creates a new version row with the same `ref_code`.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)

- 2026-08-08 — Migration `0012_knowledge_base.sql` + `models/siaga_kb.py` (vokabuler + detektor dosis/merek murni), `dto/siaga_kb.py` / `dto/kb.py`, dan nama tabel di `config/base.py`. Invarian indeks aktif (disetujui + versi terkini + belum kedaluwarsa + sumber belum dipensiunkan) tinggal di SATU tempat: view `kb_active_chunks`. Versi baru = baris baru — unique `(ref_code, version)`, unique parsial `ux_kb_chunks_ref_current`, trigger `trg_kb_chunks_no_rewrite` menolak penulisan ulang isi/ref_code/version, `kb_audit_events` append-only via trigger. Kolom tambahan di luar draf kontrak: `phase_tags` (dibutuhkan uji pengambilan disease+phase), `is_current`, `valid_until`, `ordinal`. Diverifikasi lewat 58 pytest baru yang memakai fake repo yang mencerminkan aturan SQL tersebut. Diterapkan LIVE ke stack Supabase lokal pada 2026-08-09 (`docker exec supabase-db psql -f 0012_knowledge_base.sql`, ON_ERROR_STOP, tanpa error). Verifikasi langsung di Postgres: indeks aktif hanya memuat potongan disetujui (draf tersaring), penulisan ulang isi ditolak `55000`, `(ref_code, version)` ganda ditolak `23505`, dua baris current untuk satu ref ditolak `23505` (`ux_kb_chunks_ref_current`), versi baru di bawah ref yang sama berhasil, `kb_audit_events` menolak UPDATE (`55000`), dan pensiun sumber mengosongkan indeks aktif. Data uji dibersihkan setelah verifikasi (tabel kembali kosong).
