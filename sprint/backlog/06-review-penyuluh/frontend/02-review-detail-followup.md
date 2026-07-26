# Task 02 — Layar Detail Review + Tindak Lanjut

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`./01-review-queue.md`](./01-review-queue.md) — entry point
- [`../backend/01-review-routes.md`](../backend/01-review-routes.md) — evidence bundle + decision endpoints

## Goal

Satu layar semua bukti: foto bersanding + peta sorotan bukti, panel hasil AI (kandidat/skor/kualitas/versi), panel konteks kuesioner + urgensi, panel rekomendasi + rujukan, linimasa — dengan bilah aksi sticky (Konfirmasi / Koreksi / Minta Foto / Eskalasi) dan form tindak lanjut setelah keputusan.

## Files to touch

- `apps/web/src/pages/review-detail/` + `parts/` — evidence panels + sticky action bar
- `apps/web/src/features/review/detail/components/` — photo compare w/ highlights, AI panel, correction modal (official taxonomy + reason list + free note), revision-request modal, escalation modal, follow-up form + timeline

## Skills to consult

- `apps/web/skills/reactjs-data-display/SKILL.md` — evidence panel layout
- `apps/web/skills/reactjs-form/SKILL.md` — decision/follow-up forms
- `apps/web/skills/reactjs-responsive/SKILL.md` — sticky action bar + PerfectScrollArea panels

## TODOs

- [ ] Evidence layout: photos side-by-side with highlight overlay toggle; AI/context/recommendation/timeline panels
- [ ] Sticky action bar always visible; correction modal restricted to official taxonomy (else "Lainnya/Tidak Diketahui"), reason required before save enabled
- [ ] Revision-request modal with guidance text; escalation modal with summary
- [ ] Post-decision follow-up form (jenis, tenggat) + follow-up timeline (direncanakan→dilakukan→selesai; reschedule; closing note wajib untuk menutup kasus)
- [ ] Save → return to queue with filters kept; farmer-visible status copy never includes internal notes
- [ ] Tests: reason gating disables save, taxonomy restriction, follow-up lifecycle

## Done when

Reviewer completes the 10.1 scenario end-to-end (open case → correct label with reason → schedule kunjungan → farmer status updates) against seeded data; save without reason is impossible.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
