# Task 01 — Dataset Pipeline & Curation Routes

**Stack:** backend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./00-schema-dataset.md`](./00-schema-dataset.md) — dataset schema

## Goal

Pipeline harian + endpoint kurasi: intake nominasi ber-consent dari review → de-identifikasi (verifikasi sebelum staging) → deteksi duplikat; keputusan kurasi (setujui/tolak/label ulang/sengketa + adjudikasi); pencabutan consent menarik kandidat; pembangun rilis mengunci manifes.

## Files to touch

- `apps/backend/service/dataset_pipeline.py` — scheduled batch: intake, de-identify, dedup fingerprinting
- `apps/backend/router/dataset.py`, `apps/backend/service/dataset.py`, `apps/backend/dto/dataset.py` — queue, decisions, adjudication, release builder
- consent-revocation hook from Sprint 02's profile/consent endpoints

## Skills to consult

- `apps/backend/skills/python-api-design/SKILL.md` — layering
- `apps/backend/skills/python-async-performance/SKILL.md` — background batch job

## TODOs

- [ ] Daily batch: nominated + consent → de-identified research asset (verify no identity/phone/precise coords before staging) + masked group keys
- [ ] Dedup detection vs existing candidates → `dedup_of` link for the compare panel
- [ ] Decision endpoints: approve/reject/relabel/dispute; ambiguous labels require second reviewer; disputes excluded from releases until adjudicated (adjudication logged)
- [ ] Consent revocation → withdraw candidates via case link; record exclusion for next release manifest
- [ ] Release builder: compose from approved candidates → class distribution summary → lock manifest (immutable)
- [ ] Unit tests: consent gate, de-identification verification, dispute exclusion, revocation withdrawal, manifest lock

## Done when

A consented correction flows to a de-identified candidate; a disputed candidate cannot enter a release; revoking consent withdraws it and the next manifest records the exclusion; locked manifests reject edits; tests green.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/backend.md` (Task completed)

## Notes

(Append-only.)
