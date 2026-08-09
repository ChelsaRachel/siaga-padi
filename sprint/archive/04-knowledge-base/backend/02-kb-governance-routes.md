# Task 02 — KB Governance Routes (Catalog, Approval, Diff, Retire)

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** ✅ Done
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-kb.md`](./00-schema-kb.md) — schema
- [`./01-kb-ingest-retrieval.md`](./01-kb-ingest-retrieval.md) — ingest produces the review queue

## Goal

Endpoint tata kelola: CRUD sumber + metadata lisensi, antrean persetujuan potongan (setujui/tolak + alasan), penanda kebijakan wajib untuk konten dosis/merek, banding versi (diff), pensiun sumber, dan audit setiap keputusan.

## Files to touch

- `apps/backend/router/kb_governance.py`, `apps/backend/service/kb_governance.py`, `apps/backend/dto/kb.py`

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — layering + envelope
- `apps/backend/skills/python-auth/SKILL.md` — admin vs domain_reviewer role split

## TODOs

- [x] Source registration/edit (admin); chunk approve/reject with mandatory reason (domain_reviewer)
- [x] Enforce: chunks with dosage/brand content cannot be approved without a policy flag
- [x] Version diff endpoint (draf vs aktif chunk content) for the diff view
- [x] Retire source → out of active index, history intact; version activation audit-logged (second-person approval arrives with Sprint 08 — leave a guarded TODO seam)
- [x] Unit tests: approval gates, policy-flag enforcement, retire behavior

## Done when

A reviewer can approve/reject queued chunks with reasons; approving a dosage-bearing chunk without policy flag is rejected by the API; retired source chunks disappear from retrieval but old case references still resolve.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [x] All `## TODOs` items above are `[x]`
- [x] Done-when assertion verified
- [x] Header reads `**Status:** ✅ Done`
- [x] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)

- 2026-08-08 — `service/kb_governance.py` + `router/kb_governance.py` + `service/kb_support.py` (repo seam, audit writer, validator bersama). Gerbang kebijakan membaca ULANG isi potongan saat persetujuan (`detect_policy_flag`), bukan saran hasil ingest — menyetujui potongan berdosis tanpa penanda ditolak 400. Alasan penolakan wajib. Revisi menulis baris versi baru di bawah `ref_code` yang sama dan mengembalikan status ke `menunggu`; keputusan hanya sah pada versi terkini. Pensiun sumber mengeluarkan potongannya dari indeks aktif tetapi `GET /kb/chunks/ref/{refCode}` tetap resolve untuk kutipan kasus lama. Setiap keputusan tercatat di `kb_audit_events`; seam persetujuan orang kedua Sprint 08 ditandai konstanta `SECOND_PERSON_APPROVAL_ENABLED`. Pemisahan peran: admin mengkurasi katalog, domain_reviewer memutuskan konten. 23 pytest hijau (196 total pytest hijau).
