# Sprint Planning

Master tracking table for every sprint in this project. Update on every status change, sprint creation, or sprint move.

> **Project blueprint:** see [`../brief/00_OVERVIEW.md`](../brief/00_OVERVIEW.md) — produced by `brief-builder` from the FRD (`docs/FRD_Siaga_Padi_Web_PWA_MVP_v0.2.0.md`). This planning table refines that brief into sprints; it does not replace it. The FRD remains the source of truth for exact NFR numbers, state machines, and acceptance criteria.

| Sprint | Goal | Status | Depends On | Brief | References | Created At | Started At | Completed At |
|---|---|---|---|---|---|---|---|---|
| Sprint 01 — Auth & Roles | Login, 4 roles, beranda per peran, mode pendampingan berjejak | ✅ Done | - | [../brief/08_ADMINISTRASI_SISTEM.md](../brief/08_ADMINISTRASI_SISTEM.md) | [./archive/01-auth-roles/](./archive/01-auth-roles/) | 2026-07-25 | 2026-07-26 | 2026-07-26 |
| Sprint 02 — Case Management | Wizard kasus 3 langkah, profil petani/lahan, riwayat & linimasa | ✅ Done | 01 | [../brief/01_MANAJEMEN_KASUS_PETANI.md](../brief/01_MANAJEMEN_KASUS_PETANI.md) | [./archive/02-case-management/](./archive/02-case-management/) | 2026-07-25 | 2026-07-26 | 2026-07-26 |
| Sprint 03 — Photo & Quality | Kamera terpandu, unggah dengan progres, gerbang kualitas + retake | ✅ Done | 02 | [../brief/02_PENGAMBILAN_FOTO_KUALITAS.md](../brief/02_PENGAMBILAN_FOTO_KUALITAS.md) | [./archive/03-photo-quality/](./archive/03-photo-quality/) | 2026-07-25 | 2026-07-29 | 2026-07-29 |
| Sprint 04 — Knowledge Base | Katalog sumber, persetujuan potongan rujukan, uji pengambilan | ✅ Done | 01 | [../brief/06_TATA_KELOLA_PENGETAHUAN.md](../brief/06_TATA_KELOLA_PENGETAHUAN.md) | [./archive/04-knowledge-base/](./archive/04-knowledge-base/) | 2026-07-25 | 2026-08-08 | 2026-08-08 |
| Sprint 05 — AI Triage | Indikasi CV terkalibrasi + abstain, kuesioner konteks, rekomendasi berbasis rujukan | ✅ Done | 03, 04 | [../brief/03_TRIASE_REKOMENDASI_AI.md](../brief/03_TRIASE_REKOMENDASI_AI.md) | [./archive/05-ai-triage/](./archive/05-ai-triage/) | 2026-07-25 | 2026-08-09 | 2026-08-09 |
| Sprint 06 — Review Penyuluh | Antrean prioritas, koreksi beralasan berversi, tindak lanjut | 📋 Planned | 05 | [../brief/04_REVIEW_PENYULUH.md](../brief/04_REVIEW_PENYULUH.md) | [./backlog/06-review-penyuluh/](./backlog/06-review-penyuluh/) | 2026-07-25 | - | - |
| Sprint 07 — Offline & Fallback | Antrean lokal + sinkron anti-duplikat, mode terbatas templat aturan | 📋 Planned | 02, 03, 05 | [../brief/09_MODE_OFFLINE_FALLBACK.md](../brief/09_MODE_OFFLINE_FALLBACK.md) | [./backlog/07-offline-fallback/](./backlog/07-offline-fallback/) | 2026-07-25 | - | - |
| Sprint 08 — Admin Config | Manajemen pengguna, konfigurasi draf→tinjau→aktif→rollback, kesehatan penyedia | 📋 Planned | 01 | [../brief/08_ADMINISTRASI_SISTEM.md](../brief/08_ADMINISTRASI_SISTEM.md) | [./backlog/08-admin-config/](./backlog/08-admin-config/) | 2026-07-25 | - | - |
| Sprint 09 — Dashboard & Map | Baris KPI, daftar prioritas, peta agregat wilayah (Should/MVP Extended) | 📋 Planned | 06 | [../brief/05_DASHBOARD_PETA_WILAYAH.md](../brief/05_DASHBOARD_PETA_WILAYAH.md) | [./backlog/09-dashboard-map/](./backlog/09-dashboard-map/) | 2026-07-25 | - | - |
| Sprint 10 — Dataset Feedback | Antrean kandidat dataset, de-identifikasi, rilis bermanifes (Should/MVP Extended) | 📋 Planned | 06 | [../brief/07_UMPAN_BALIK_DATASET.md](../brief/07_UMPAN_BALIK_DATASET.md) | [./backlog/10-dataset-feedback/](./backlog/10-dataset-feedback/) | 2026-07-25 | - | - |

**Status legend:** 📋 Planned · 🚧 In Progress · ✅ Done · ⏸ Paused · ❌ Cancelled

## Ordering rationale (high level)

- **01 → 02 → 03** follows the farmer's core flow (login → kasus → foto).
- **04 (KB) before 05 (Triage)**: the recommendation engine may only cite approved KB chunks — the KB contract must exist first.
- **06 (Review)** consumes triage output; **07 (Offline)** hardens flows built in 02/03/05 and adds the rule-based fallback for 05.
- **08 (Admin Config)** formalizes thresholds/providers consumed by 03/05 — until then those run on seeded config versions; every case records the config version it used.
- **09, 10** are Should (MVP Extended) and close the loop for penyuluh oversight and dataset curation.

---

*This file is updated whenever a sprint status changes, a new sprint is added, or when a phase begins/ends.*
*To add a new sprint after initial setup, follow the workflow in `.claude/skills/sprint-builder/SKILL.md` Step 2.*
*Append-only: never delete a sprint row. Cancelled sprints stay visible with status `❌ Cancelled` and a one-line reason.*
