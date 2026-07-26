# Task 02 — KB Governance Routes (Catalog, Approval, Diff, Retire)

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
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

- [ ] Source registration/edit (admin); chunk approve/reject with mandatory reason (domain_reviewer)
- [ ] Enforce: chunks with dosage/brand content cannot be approved without a policy flag
- [ ] Version diff endpoint (draf vs aktif chunk content) for the diff view
- [ ] Retire source → out of active index, history intact; version activation audit-logged (second-person approval arrives with Sprint 08 — leave a guarded TODO seam)
- [ ] Unit tests: approval gates, policy-flag enforcement, retire behavior

## Done when

A reviewer can approve/reject queued chunks with reasons; approving a dosage-bearing chunk without policy flag is rejected by the API; retired source chunks disappear from retrieval but old case references still resolve.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
