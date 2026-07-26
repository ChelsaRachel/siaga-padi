# Task 01 — Case Creation Wizard (3 Langkah)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-case-routes.md`](../backend/01-case-routes.md) — idempotent create endpoint + DTOs

## Goal

Wizard maks 3 langkah dengan tombol besar: (1) petani/lahan + panel tujuan data, (2) lokasi (GPS opsional → fallback area manual → "belum tahu") + fase, (3) konfirmasi + consent → kasus DRAF → arahkan ke alur foto (route Sprint 03, placeholder dulu).

## Files to touch

- `apps/web/src/pages/case-create/` + `parts/` — wizard steps, progress indicator (1/3…3/3)
- `apps/web/src/features/case/create/components/` — step forms, GPS-permission branch, consent panel
- `apps/web/src/services/cases.ts` — create client generating an idempotency key per wizard session
- `apps/web/src/routes/` + `src/config/menu/` — route + "Periksa Tanaman" entry (menu wired same unit of work)

## Skills to consult

- `apps/web/skills/reactjs-form/SKILL.md` — multi-step form pattern
- `apps/web/skills/reactjs-features/SKILL.md` — domain placement (`features/case/`)
- `apps/web/skills/reactjs-responsive/SKILL.md` — field-use mobile ergonomics
- `apps/web/skills/reactjs-error-handling/SKILL.md` — submit failure without losing input

## TODOs

- [ ] Step 1: pick existing lahan or "buat baru" (free-name); assisted mode reads subject from Sprint 01 store
- [ ] Step 2: request GPS permission; denied → kabupaten→kecamatan picker; "belum tahu" allowed; banner "GPS opsional"
- [ ] Step 3: summary card (pemilik, lahan, fase, consent) + submit with idempotency key kept until success
- [ ] Success → navigate to photo flow route carrying case id (placeholder page until Sprint 03)
- [ ] Failed submit keeps all input; retry reuses the same key
- [ ] Component tests: GPS-denied branch, idempotency-key reuse on retry

## Done when

All three branches (GPS granted / denied→manual area / belum tahu) produce a DRAF case and land on the photo placeholder with the case id; double-submit creates one case.

## Closing checklist

> Complete these steps **in order**. These checkboxes are evidence of work already performed, not reminders.
> The task is only truly complete when the header at the top of this file literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified (build/test/manual)
- [ ] Top-of-file header literally reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (event: Task completed)

## Notes

(Append-only.)
