# Task 03 — Recommendation Engine + Safety Checker

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./02-questionnaire-engine.md`](./02-questionnaire-engine.md) — answers complete the context
- [`../../04-knowledge-base/backend/01-kb-ingest-retrieval.md`](../../04-knowledge-base/backend/01-kb-ingest-retrieval.md) — approved-chunk retrieval

## Goal

Penyusun rekomendasi: ambil rujukan tervalidasi → satu pemanggilan AI bahasa terbatas (data minimal, tanpa PII/foto) → keluaran terstruktur dua tampilan → pemeriksa keamanan (setiap saran ber-rujukan, nol dosis/merek, format valid) → simpan; rujukan kurang → "bukti tidak cukup" + wajib review; kegagalan berulang → seam fallback aturan (Sprint 07).

## Files to touch

- `apps/backend/service/recommendation.py` — retrieval + prompt assembly + structured output parsing
- `apps/backend/service/safety_checker.py` — citation coverage, forbidden-term scan (dosis/merek), schema validation, policy-flag enforcement (flagged chunks linkable for penyuluh, never narrated to petani)
- `apps/backend/router/recommendation.py`, `apps/backend/dto/recommendation.py`

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — service/router layering
- `apps/backend/skills/python-config/SKILL.md` — provider keys via env/secret store only

## TODOs

- [ ] Retrieval by top candidates + phase + audience; below minimum refs → `insufficient_evidence` output + wajib-review (AI not called)
- [ ] Provider call sends only: analysis summary + answers + retrieved chunk contents — no names, phones, precise coords, raw photos (assert in tests)
- [ ] Safety checker: every actionable suggestion cites ≥1 ref; forbidden terms blocked; malformed output → limited retries → mark for fallback seam
- [ ] Persist recommendation (farmer + technical views, ref codes, origin); case → `hasil_siap`; per-case record of model/provider/threshold/KB versions
- [ ] Low band → output emphasizes uncertainty + escalation, not confident advice
- [ ] Unit tests: insufficient-evidence path, forbidden-term block, citation coverage, PII exclusion

## Done when

A fixture case with approved KB chunks yields a stored recommendation whose every suggestion carries refs and zero dosage/brand terms in the farmer view; a case with too-few refs stores `insufficient_evidence` and flags review; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
