# Task 01 — Integrasi Antrean Offline (Banner, Penghitung, Sinkron)

**Stack:** frontend
**Sprint:** [`../sprint.md`](../sprint.md)
**Status:** 📋 Planned
**Foundation:** no
**Autonomous:** yes
**Depends on:**
- [`../backend/01-sync-idempotency.md`](../backend/01-sync-idempotency.md) — idempotent write + conflict contract

## Goal

Integrasikan mekanisme antrean opt-in yang sudah ada di branch `feat/offline-pwa-support` (tinjau dulu — jangan tulis ulang) ke form kasus/foto/kuesioner: banner offline, penghitung tertunda, waktu sinkron terakhir, daftar item per status (menunggu/mengirim/terkirim/gagal/konflik), coba-ulang manual, kedaluwarsa 7 hari, dan purge saat logout perangkat bersama.

## Files to touch

- Review & merge/adapt `feat/offline-pwa-support` implementation (service worker + queue store)
- `apps/web/src/features/offline/components/` — banner, pending counter, item list, conflict note view
- wire case wizard (S02), photo upload (S03), questionnaire (S05) submissions through the opt-in queue explicitly

## Skills to consult

- `apps/web/skills/reactjs-state-management/SKILL.md` — queue store integration
- `apps/web/skills/reactjs-error-handling/SKILL.md` — visible failure states
- `apps/web/skills/reactjs-responsive/SKILL.md` — banner placement

## TODOs

- [ ] Audit `feat/offline-pwa-support` branch; document what is reused vs adapted in Notes
- [ ] Route the three write flows through the opt-in queue with idempotency keys/fingerprints
- [ ] Banner shows which services are down and what still works; counter click → per-case pending list
- [ ] Auto-sync on reconnect with growing backoff + attempt cap; over-cap → archived-failed + manual retry; conflict (409) stored intact and viewable
- [ ] 7-day local expiry; shared-device logout purge; copy never claims server receipt prematurely
- [ ] Tests: queue-replay dedup, failure archive, conflict persistence, purge on logout

## Done when

The 10.1 scenario passes: create case + 2 photos offline → banner shows 3 pending → reconnect → auto-sync completes with no duplicates and normal flow resumes; a forced conflict is preserved and viewable.

## Closing checklist

> Evidence of performed work, in order. Complete only when the header literally reads `**Status:** ✅ Done`.

- [ ] All `## TODOs` items above are `[x]`
- [ ] Done-when assertion verified
- [ ] Header reads `**Status:** ✅ Done`
- [ ] Changelog entry appended to `changelog/web.md` (Task completed)

## Notes

(Append-only.)
