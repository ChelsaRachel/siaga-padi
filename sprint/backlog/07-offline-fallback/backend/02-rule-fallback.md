# Task 02 — Rule-based Fallback Renderer + Reprocess

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../../05-ai-triage/backend/03-recommendation-engine.md`](../../05-ai-triage/backend/03-recommendation-engine.md) — fallback seam + origin field

## Goal

Perender fallback: saat penyedia AI bahasa gagal setelah percobaan terbatas, susun arahan dari hasil analisis gambar + penanda kuesioner + templat konten KB tervalidasi → rekomendasi `origin='rule_fallback'`; analisis gambar mati → kasus tersimpan + antre review tanpa label; layanan pulih → kasus bisa diproses ulang penuh.

## Files to touch

- `apps/backend/service/rule_fallback.py` — template composition from validated KB content per indication + urgency flags
- `apps/backend/service/recommendation.py` — wire the seam: provider failure → limited retries (backoff) → fallback; degradation matrix (only-LLM-down vs CV-down vs offline)
- reprocess endpoint/job: re-run full recommendation when provider recovers (provider health from Sprint 08 seam)

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — service layering
- `apps/backend/skills/python-async-performance/SKILL.md` — retry/backoff without blocking

## TODOs

- [ ] Template composer: indication + phase + urgency → safe actions from validated KB templates (no dosage/brand; same safety checker pass)
- [ ] Degradation matrix: LLM down → fallback recommendation (CV result preserved); CV down → store case, queue human review, never fabricate labels; both → offline path (client-side)
- [ ] `origin='rule_fallback'` set; farmer copy includes "hubungi penyuluh" emphasis
- [ ] Reprocess path: fallback cases re-composable to full recommendation on recovery (new row, history kept)
- [ ] Tests: fallback trigger after N failures, no-label-on-CV-down, reprocess creates new version

## Done when

Simulated provider failure yields a rule-fallback recommendation passing the safety checker; simulated CV failure stores the case for review with no label; reprocess produces a full recommendation without deleting the fallback row; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
