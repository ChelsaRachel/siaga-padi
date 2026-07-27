# Sprint Planning Changelog

Tracks all sprint lifecycle events — sprints created, promoted to active, archived, cancelled.

Append-only. Newest entries at the top. Updated whenever sprint status changes in `sprint/01-sprint-planning.md`.

---

### 2026-07-26 · Sprint 02 — case-management · ARCHIVED

**Event:** Archived
**Sprint:** [02-case-management](../sprint/archive/02-case-management/sprint.md)
> Semua 5 task selesai. Migration 0010 + trigger/idempotensi/RLS diverifikasi live, seluruh test/build hijau, dan smoke browser membuktikan wizard, antrean offline, profil/lahan, pagination/filter, serta linimasa.

### 2026-07-26 · Sprint 02 — case-management · PROMOTED

**Event:** Promoted to active
**Sprint:** [02-case-management](../sprint/active/02-case-management/sprint.md)
> Sprint kedua dimulai: wizard kasus 3 langkah + profil/lahan + riwayat & linimasa (FR-002, FR-009). Foundation task: `backend/00-schema-case.md` (migration 0010, state machine FRD §6.5–6.6, kunci anti-duplikat).

### 2026-07-26 · Sprint 01 — auth-roles · ARCHIVED

**Event:** Archived
**Sprint:** [01-auth-roles](../sprint/archive/01-auth-roles/sprint.md)
> Semua 6 task selesai. Migrasi 0009 diterapkan + RLS diverifikasi dua-user di stack Supabase lokal; E2E smoke (4 role, lockout, mode pendampingan) lulus di browser nyata. Dipindah dari `active/` ke `archive/`.

### 2026-07-26 · Sprint 01 — auth-roles · PROMOTED

**Event:** Promoted to active
**Sprint:** [01-auth-roles](../sprint/active/01-auth-roles/sprint.md)
> Sprint pertama dimulai: login + 4 peran + beranda per peran + mode pendampingan berjejak. Foundation task: `backend/00-schema-auth.md`.

### 2026-07-25 · Sprint 10 — dataset-feedback · CREATED

**Event:** Sprint created
**Sprint:** [10-dataset-feedback](../sprint/backlog/10-dataset-feedback/sprint.md)
> Antrean kandidat dataset ber-consent, de-identifikasi, kurasi, rilis bermanifes terkunci (FR-012, Should/MVP Extended).

### 2026-07-25 · Sprint 09 — dashboard-map · CREATED

**Event:** Sprint created
**Sprint:** [09-dashboard-map](../sprint/backlog/09-dashboard-map/sprint.md)
> KPI harian penyuluh, daftar prioritas + ekspor terbatas, peta agregat wilayah (FR-010, Should/MVP Extended).

### 2026-07-25 · Sprint 08 — admin-config · CREATED

**Event:** Sprint created
**Sprint:** [08-admin-config](../sprint/backlog/08-admin-config/sprint.md)
> Manajemen pengguna/role + konfigurasi draf→tinjau→aktif→rollback + kesehatan/pagu penyedia (FR-013, sisa FR-001).

### 2026-07-25 · Sprint 07 — offline-fallback · CREATED

**Event:** Sprint created
**Sprint:** [07-offline-fallback](../sprint/backlog/07-offline-fallback/sprint.md)
> Antrean offline + sinkron anti-duplikat + fallback templat aturan "mode terbatas" (FR-014).

### 2026-07-25 · Sprint 06 — review-penyuluh · CREATED

**Event:** Sprint created
**Sprint:** [06-review-penyuluh](../sprint/backlog/06-review-penyuluh/sprint.md)
> Antrean review prioritas keselamatan, koreksi beralasan berversi, tindak lanjut (FR-008).

### 2026-07-25 · Sprint 05 — ai-triage · CREATED

**Event:** Sprint created
**Sprint:** [05-ai-triage](../sprint/backlog/05-ai-triage/sprint.md)
> Indikasi CV terkalibrasi + abstain, kuesioner konteks, rekomendasi berbasis rujukan KB (FR-005/006/007).

### 2026-07-25 · Sprint 04 — knowledge-base · CREATED

**Event:** Sprint created
**Sprint:** [04-knowledge-base](../sprint/backlog/04-knowledge-base/sprint.md)
> Katalog sumber resmi, persetujuan potongan rujukan + penanda kebijakan, uji pengambilan (FR-011).

### 2026-07-25 · Sprint 03 — photo-quality · CREATED

**Event:** Sprint created
**Sprint:** [03-photo-quality](../sprint/backlog/03-photo-quality/sprint.md)
> Kamera terpandu, unggah dengan progres, gerbang kualitas + panduan foto ulang (FR-003/004).

### 2026-07-25 · Sprint 02 — case-management · CREATED

**Event:** Sprint created
**Sprint:** [02-case-management](../sprint/backlog/02-case-management/sprint.md)
> Wizard kasus 3 langkah, profil petani/lahan, riwayat + linimasa (FR-002/009).

### 2026-07-25 · Sprint 01 — auth-roles · CREATED

**Event:** Sprint created
**Sprint:** [01-auth-roles](../sprint/backlog/01-auth-roles/sprint.md)
> Login 4 role, beranda per peran, mode pendampingan berjejak (FR-001). Sprint pertama — fondasi semua sprint lain.

<!-- ENTRY FORMAT:
### YYYY-MM-DD · Sprint NN — slug · EVENT

**Event:** Sprint created | Promoted to active | Archived | Cancelled | Task added | Sprint revised
**Sprint:** [NN-slug](../sprint/backlog/NN-slug/sprint.md)
> One-line reason or outcome.
-->
