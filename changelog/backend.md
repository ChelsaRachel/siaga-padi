# Backend Changelog

Tracks all backend changes across sprints — API routes added, DB migrations applied, services built, auth changes.

Append-only. Newest entries at the top. Updated whenever a backend task is created or completed.

---

### 2026-08-08 · [Sprint 04 — knowledge-base](../sprint/archive/04-knowledge-base/sprint.md) · Task: [02 — KB Governance Routes](../sprint/archive/04-knowledge-base/backend/02-kb-governance-routes.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/router/kb_governance.py`, `apps/backend/service/kb_governance.py`, `apps/backend/service/kb_support.py`, `apps/backend/dto/kb.py`, `apps/backend/middleware/role_guard.py`, `apps/backend/tests/test_kb_governance.py`
> Katalog sumber (daftar/edit/pensiun, lisensi wajib), antrean persetujuan potongan dengan alasan tolak wajib, gerbang kebijakan yang membaca ULANG isi potongan saat approve (dosis/merek tanpa penanda → 400), revisi = baris versi baru di bawah `ref_code` yang sama (yang lama jadi non-current, isi utuh), pensiun sumber keluar dari indeks aktif tanpa memutus kutipan kasus lama, dan jejak audit append-only tiap keputusan. Pemisahan peran admin (katalog) vs domain_reviewer (konten). 23 pytest baru; 196 pytest total hijau.

### 2026-08-08 · [Sprint 04 — knowledge-base](../sprint/archive/04-knowledge-base/sprint.md) · Task: [01 — KB Ingest + Retrieval Index](../sprint/archive/04-knowledge-base/backend/01-kb-ingest-retrieval.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/service/kb_ingest.py`, `apps/backend/service/kb_retrieval.py`, `apps/backend/router/kb_retrieval.py`, `apps/backend/requirements.txt`, `apps/backend/api.py`, `apps/backend/tests/test_kb_ingest.py`, `apps/backend/tests/test_kb_retrieval.py`
> Ingest PDF (pypdf, lokasi `Hal. N`) / teks-markdown (lokasi `§ Judul`) → potongan deterministik ~700 karakter dengan auto-tag penyakit/fase/tindakan, saran penanda kebijakan, dan ref code stabil `RUJ-BLAS-004`; semua potongan mendarat `menunggu` — ingest tidak pernah menyetujui. Pengambilan hanya membaca view `kb_active_chunks` (draf/ditolak/kedaluwarsa/sumber pensiun mustahil bocor), peringkat deterministik penyakit>fase>tindakan>audiens dengan tie-break ref code, `policyFlag` + `narratable` ikut tiap hit, dan log menyimpan ref code + faset saja. `/kb/retrieval` untuk mesin rekomendasi Sprint 05 via `X-Internal-Token`, `/kb/retrieval-test` untuk admin/reviewer. 35 pytest baru.

### 2026-08-08 · [Sprint 04 — knowledge-base](../sprint/archive/04-knowledge-base/sprint.md) · Task: [00 — Schema KB](../sprint/archive/04-knowledge-base/backend/00-schema-kb.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/supabase/migrations/0012_knowledge_base.sql`, `apps/backend/models/siaga_kb.py`, `apps/backend/dto/siaga_kb.py`, `apps/backend/config/base.py`, `apps/backend/tests/conftest.py`
> Migration 0012: `kb_sources` (lisensi wajib, status draf/disetujui/dipensiunkan, ketersediaan), `kb_chunks` (ref code stabil + versi, unique `(ref_code, version)` + unique parsial satu versi current, penanda penyakit/fase/tindakan/audiens/risiko/kebijakan, kedaluwarsa), `kb_audit_events` append-only, `kb_retrieval_logs` (ref code saja), view `kb_active_chunks` sebagai SATU definisi indeks aktif, trigger penolak penulisan ulang isi, dan RLS kurator vs pembaca kutipan. Diterapkan live ke stack Supabase lokal (2026-08-09) dan diverifikasi langsung di Postgres: draf tersaring dari indeks aktif, penulisan ulang isi & mutasi audit ditolak `55000`, ref/version ganda dan dua baris current ditolak `23505`, pensiun sumber mengosongkan indeks. Data uji dibersihkan setelah verifikasi.

### 2026-07-29 · [Sprint 03 — photo-quality](../sprint/active/03-photo-quality/sprint.md) · Task: [01 — Upload Endpoint + Quality Gate](../sprint/active/03-photo-quality/backend/01-upload-quality-gate.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/router/photos.py`, `apps/backend/service/photos.py`, `apps/backend/service/quality_gate.py`, `apps/backend/service/siaga_case_support.py`, `apps/backend/service/cases.py`, `apps/backend/api.py`, `apps/backend/requirements.txt`, `apps/backend/tests/test_photos.py`, `apps/backend/tests/conftest.py`, `apps/web/docs/api-spec-photo.md`
> Unggah multipart + gerbang kualitas deterministik (ketajaman Laplacian, luma, resolusi, cakupan hijau) → status layak/ditolak/ambang/tidak_pasti dengan maks 3 alasan sederhana; skor mentah hanya di log server. Dedup sha256 per kasus (replay tanpa duplikat), EXIF+GPS dihapus sebelum simpan, ≥2 foto diterima → DRAFT→CAPTURED via tabel transisi legal, 3× gagal per slot → escalate `needs_human_review`. 138 pytest hijau; verifikasi live: signed URL 200, akses publik/anonim 400.

### 2026-07-29 · [Sprint 03 — photo-quality](../sprint/active/03-photo-quality/sprint.md) · Task: [00 — Schema Photos](../sprint/active/03-photo-quality/backend/00-schema-photos.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/supabase/migrations/0011_case_photos.sql`, `apps/backend/models/siaga_photo.py`, `apps/backend/dto/siaga_photo.py`, `apps/backend/config/base.py`
> Migration 0011 diterapkan live: tabel `case_photos` (status kualitas, alasan ≤3, retake, fingerprint unik per kasus, versi config, exif_stripped, never_for_training) + kolom escalation `needs_human_review` di `cases` + bucket privat `case-photos` (signed URL saja) + RLS mengikuti visibilitas kasus. Verifikasi live: duplicate fingerprint ditolak (23505), bucket non-publik. Catatan infra: mount storage diganti named volume (bind mount macOS tanpa xattr membuat supabase-storage 500).

### 2026-07-26 · [Sprint 02 — case-management](../sprint/archive/02-case-management/sprint.md) · Task: [00 — Schema Case](../sprint/archive/02-case-management/backend/00-schema-case.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/supabase/migrations/0010_siaga_case.sql`, `apps/backend/models/siaga_case.py`, `apps/backend/dto/siaga_case.py`, `apps/backend/tests/test_case_transitions.py`
> Migration 0010 diterapkan di stack Supabase lokal. Trigger transisi ilegal (`23514`), append-only `case_events` (`55000`), kunci idempotensi unik (`23505`), dan RLS petani/penyuluh lulus verifikasi live; 119 pytest tetap hijau.

### 2026-07-26 · [Sprint 02 — case-management](../sprint/active/02-case-management/sprint.md) · Task: [01 — Case Routes](../sprint/active/02-case-management/backend/01-case-routes.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/router/cases.py`, `apps/backend/router/farmer_profile.py`, `apps/backend/service/cases.py`, `apps/backend/service/farmer_profile.py`, `apps/backend/service/siaga_case_support.py`, `apps/backend/dto/cases.py`, `apps/backend/dto/farmer_profile.py`, `apps/backend/middleware/user_context.py`, `apps/backend/exceptions/siaga_exceptions.py`, `apps/backend/api.py`, `apps/backend/tests/`
> Kasus idempoten (header wajib, replay hanya oleh pembuat key), validasi FR-002 lengkap, jalur pendampingan (pemilik = subjek), daftar ter-scope peran + filter displayStage, detail/linimasa dengan 404 identik anti-enumerasi, profil/lahan/permintaan-penghapusan. 119 pytest hijau (coverage 89%/86%). Hardening review: pembatasan peran create (petani, atau penyuluh bersesi), batas koordinat lat ±90 / lng ±180.

### 2026-07-26 · [Sprint 02 — case-management](../sprint/active/02-case-management/sprint.md) · Task: [00 — Schema Case](../sprint/active/02-case-management/backend/00-schema-case.md) · 📋 Added

**Event:** Task created
**Files:** `apps/backend/supabase/migrations/0010_siaga_case.sql`, `apps/backend/models/siaga_case.py`, `apps/backend/dto/siaga_case.py`, `apps/backend/tests/test_case_transitions.py`
> Foundation: lahan/kasus/case_events/permintaan-penghapusan + state machine FRD §6.5–6.6 (trigger DB + tabel Python satu-sumber) + kunci anti-duplikat + RLS. Status kanonik FRD disimpan; tahap Indonesia sebagai `displayStage` turunan. Apply migration + verifikasi RLS dua-user menunggu stack Supabase (server dev tanpa akses Docker).

### 2026-07-26 · [Sprint 01 — auth-roles](../sprint/active/01-auth-roles/sprint.md) · Task: [00 — Schema Auth](../sprint/active/01-auth-roles/backend/00-schema-auth.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/supabase/migrations/0009_siaga_auth.sql`, `apps/backend/models/siaga_profile.py`, `apps/backend/dto/siaga_profile.py`, `apps/backend/scripts/seed_siaga_pilot.py`
> Migration 0009 diterapkan di stack Supabase lokal (4 tabel + RLS); verifikasi dua-user via psql: petani hanya baris sendiri, penyuluh hanya kecamatan binaan (Ciparay, Baleendah) — tidak ada kebocoran lintas peran. 5 akun pilot sintetis di-seed. Ini menutup satu-satunya task yang tersisa di Sprint 01.

### 2026-07-26 · [Sprint 01 — auth-roles](../sprint/active/01-auth-roles/sprint.md) · Task: [02 — Assisted Mode Routes](../sprint/active/01-auth-roles/backend/02-assisted-mode-routes.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/router/assisted.py`, `apps/backend/service/assisted.py`, `apps/backend/dto/assisted.py`, `apps/backend/tests/test_assisted.py`
> Search petani terbatas binaan (tidak pernah global), start/end sesi dengan consent method tercatat (baris `assisted_sessions` = audit stamp), 403 di luar scope; teruji unit via fake repo.

### 2026-07-26 · [Sprint 01 — auth-roles](../sprint/active/01-auth-roles/sprint.md) · Task: [01 — Auth Routes](../sprint/active/01-auth-roles/backend/01-auth-routes.md) · ✅ Done

**Event:** Task completed
**Files:** `apps/backend/router/siaga_auth.py`, `apps/backend/service/siaga_auth.py`, `apps/backend/dto/siaga_auth.py`, `apps/backend/dto/siaga_profile.py`, `apps/backend/models/siaga_profile.py`, `apps/backend/middleware/role_guard.py`, `apps/backend/util/siaga_response.py`, `apps/backend/exceptions/siaga_exceptions.py`, `apps/backend/api.py`, `apps/backend/config/base.py`, `apps/backend/auth/auth_bearer.py`, `apps/backend/auth/auth_handler.py`, `apps/backend/tests/`
> Login + lockout 5x/15 menit (423 + retryAfter, body 401 identik anti-enumerasi), refresh, `/me` camelCase, role guard berbasis DB. 40 unit test hijau (coverage 83–89% modul baru). Hardening hasil security review: backdoor token boilerplate dihapus, invalid token 403→401, guard error ber-envelope top-level, RateLimitMiddleware terdaftar (RATE_LIMIT=300/60s), secret OTP/change-token pindah ke settings.

### 2026-07-25 · [Sprint 10 — dataset-feedback](../sprint/backlog/10-dataset-feedback/sprint.md) · Task: [01 — Dataset Pipeline & Curation Routes](../sprint/backlog/10-dataset-feedback/backend/01-dataset-pipeline-routes.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/10-dataset-feedback/backend/01-dataset-pipeline-routes.md`
> De-identifikasi batch, dedup, keputusan kurasi + adjudikasi, penarikan consent, pengunci manifes rilis.

### 2026-07-25 · [Sprint 10 — dataset-feedback](../sprint/backlog/10-dataset-feedback/sprint.md) · Task: [00 — Schema Dataset](../sprint/backlog/10-dataset-feedback/backend/00-schema-dataset.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/10-dataset-feedback/backend/00-schema-dataset.md`
> Foundation: kandidat dataset, rilis + manifes terkunci, kelompok samaran (migration 0016).

### 2026-07-25 · [Sprint 09 — dashboard-map](../sprint/backlog/09-dashboard-map/sprint.md) · Task: [01 — Dashboard Aggregates, Masking, Export](../sprint/backlog/09-dashboard-map/backend/01-dashboard-aggregates.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/09-dashboard-map/backend/01-dashboard-aggregates.md`
> KPI cache ≤15 menit, daftar prioritas, agregat area tersamar, ekspor tautan 24 jam.

### 2026-07-25 · [Sprint 08 — admin-config](../sprint/backlog/08-admin-config/sprint.md) · Task: [01 — Config Routes + Provider Health/Budget](../sprint/backlog/08-admin-config/backend/01-config-routes-health.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/08-admin-config/backend/01-config-routes-health.md`
> Draf→setujui(orang kedua)→aktif→rollback + user admin + job kesehatan/pagu penyedia.

### 2026-07-25 · [Sprint 08 — admin-config](../sprint/backlog/08-admin-config/sprint.md) · Task: [00 — Schema Config](../sprint/backlog/08-admin-config/backend/00-schema-config.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/08-admin-config/backend/00-schema-config.md`
> Foundation: config_versions satu-aktif-per-lingkup, audit diff, provider health & budget (migration 0015).

### 2026-07-25 · [Sprint 07 — offline-fallback](../sprint/backlog/07-offline-fallback/sprint.md) · Task: [03 — Backlog & Error Metrics](../sprint/backlog/07-offline-fallback/backend/03-backlog-metrics.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/07-offline-fallback/backend/03-backlog-metrics.md`
> Agregat kesehatan sistem untuk panel admin (hijau/kuning/merah).

### 2026-07-25 · [Sprint 07 — offline-fallback](../sprint/backlog/07-offline-fallback/sprint.md) · Task: [02 — Rule-based Fallback Renderer](../sprint/backlog/07-offline-fallback/backend/02-rule-fallback.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/07-offline-fallback/backend/02-rule-fallback.md`
> Fallback templat aturan saat AI bahasa gagal; CV mati → simpan + review tanpa label; reprocess saat pulih.

### 2026-07-25 · [Sprint 07 — offline-fallback](../sprint/backlog/07-offline-fallback/sprint.md) · Task: [01 — Sync Idempotency + Conflict Contract](../sprint/backlog/07-offline-fallback/backend/01-sync-idempotency.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/07-offline-fallback/backend/01-sync-idempotency.md`
> Idempotensi semua endpoint antrean sinkron + respons konflik 409 terstruktur.

### 2026-07-25 · [Sprint 06 — review-penyuluh](../sprint/backlog/06-review-penyuluh/sprint.md) · Task: [01 — Review Routes](../sprint/backlog/06-review-penyuluh/backend/01-review-routes.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/06-review-penyuluh/backend/01-review-routes.md`
> Antrean prioritas keselamatan, keputusan beralasan, revisi, eskalasi POPT, tindak lanjut, nominasi dataset.

### 2026-07-25 · [Sprint 06 — review-penyuluh](../sprint/backlog/06-review-penyuluh/sprint.md) · Task: [00 — Schema Review](../sprint/backlog/06-review-penyuluh/backend/00-schema-review.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/06-review-penyuluh/backend/00-schema-review.md`
> Foundation: review berversi (AI beku), follow-ups, eskalasi, flag nominasi (migration 0014).

### 2026-07-25 · [Sprint 05 — ai-triage](../sprint/backlog/05-ai-triage/sprint.md) · Task: [03 — Recommendation Engine + Safety Checker](../sprint/backlog/05-ai-triage/backend/03-recommendation-engine.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/05-ai-triage/backend/03-recommendation-engine.md`
> Rekomendasi berbasis rujukan KB, satu panggilan LLM terbatas tanpa PII, pemeriksa keamanan nol dosis/merek.

### 2026-07-25 · [Sprint 05 — ai-triage](../sprint/backlog/05-ai-triage/sprint.md) · Task: [02 — Questionnaire Engine](../sprint/backlog/05-ai-triage/backend/02-questionnaire-engine.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/05-ai-triage/backend/02-questionnaire-engine.md`
> Pemilih ≤5 pertanyaan dari bank tervalidasi + aturan urgensi (tanpa mengubah label).

### 2026-07-25 · [Sprint 05 — ai-triage](../sprint/backlog/05-ai-triage/sprint.md) · Task: [01 — CV Inference Integration](../sprint/backlog/05-ai-triage/backend/01-cv-inference.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/05-ai-triage/backend/01-cv-inference.md`
> Inferensi 4 kelas terkalibrasi, abstain/konflik, penalti kualitas; stub sampai endpoint model Chelsa siap.

### 2026-07-25 · [Sprint 05 — ai-triage](../sprint/backlog/05-ai-triage/sprint.md) · Task: [00 — Schema Triage](../sprint/backlog/05-ai-triage/backend/00-schema-triage.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/05-ai-triage/backend/00-schema-triage.md`
> Foundation: analysis_results beku, question_bank berversi, recommendations dua-tampilan (migration 0013).

### 2026-07-25 · [Sprint 04 — knowledge-base](../sprint/backlog/04-knowledge-base/sprint.md) · Task: [02 — KB Governance Routes](../sprint/backlog/04-knowledge-base/backend/02-kb-governance-routes.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/04-knowledge-base/backend/02-kb-governance-routes.md`
> CRUD sumber + lisensi, setujui/tolak potongan beralasan, penanda kebijakan wajib, diff, pensiun.

### 2026-07-25 · [Sprint 04 — knowledge-base](../sprint/backlog/04-knowledge-base/sprint.md) · Task: [01 — KB Ingest + Retrieval](../sprint/backlog/04-knowledge-base/backend/01-kb-ingest-retrieval.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/04-knowledge-base/backend/01-kb-ingest-retrieval.md`
> Ekstraksi + pemecahan dokumen, indeks hanya-disetujui, endpoint uji pengambilan.

### 2026-07-25 · [Sprint 04 — knowledge-base](../sprint/backlog/04-knowledge-base/sprint.md) · Task: [00 — Schema KB](../sprint/backlog/04-knowledge-base/backend/00-schema-kb.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/04-knowledge-base/backend/00-schema-kb.md`
> Foundation: kb_sources + kb_chunks berversi, penanda stabil RUJ-*, status persetujuan (migration 0012).

### 2026-07-25 · [Sprint 03 — photo-quality](../sprint/backlog/03-photo-quality/sprint.md) · Task: [01 — Upload + Quality Gate](../sprint/backlog/03-photo-quality/backend/01-upload-quality-gate.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/03-photo-quality/backend/01-upload-quality-gate.md`
> Strip EXIF, normalisasi, dedup fingerprint, gerbang kualitas alasan sederhana, jalur 3× gagal.

### 2026-07-25 · [Sprint 03 — photo-quality](../sprint/backlog/03-photo-quality/sprint.md) · Task: [00 — Schema Photos](../sprint/backlog/03-photo-quality/backend/00-schema-photos.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/03-photo-quality/backend/00-schema-photos.md`
> Foundation: case_photos + bucket storage + kebijakan akses signed URL (migration 0011).

### 2026-07-25 · [Sprint 02 — case-management](../sprint/backlog/02-case-management/sprint.md) · Task: [01 — Case Routes](../sprint/backlog/02-case-management/backend/01-case-routes.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/02-case-management/backend/01-case-routes.md`
> Create idempoten, daftar/detail/linimasa, profil + lahan CRUD, permintaan penghapusan data.

### 2026-07-25 · [Sprint 02 — case-management](../sprint/backlog/02-case-management/sprint.md) · Task: [00 — Schema Case](../sprint/backlog/02-case-management/backend/00-schema-case.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/02-case-management/backend/00-schema-case.md`
> Foundation: fields/cases/case_events + state machine FRD §6.5–6.6 + kunci anti-duplikat (migration 0010).

### 2026-07-25 · [Sprint 01 — auth-roles](../sprint/backlog/01-auth-roles/sprint.md) · Task: [02 — Assisted Mode Routes](../sprint/backlog/01-auth-roles/backend/02-assisted-mode-routes.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/01-auth-roles/backend/02-assisted-mode-routes.md`
> Cari petani binaan, profil minimal "didampingi", sesi pendampingan berjejak consent.

### 2026-07-25 · [Sprint 01 — auth-roles](../sprint/backlog/01-auth-roles/sprint.md) · Task: [01 — Auth Routes](../sprint/backlog/01-auth-roles/backend/01-auth-routes.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/01-auth-roles/backend/01-auth-routes.md`
> Login via Supabase JWT, lockout 5×/15 menit, /me role+assignment, role guard.

### 2026-07-25 · [Sprint 01 — auth-roles](../sprint/backlog/01-auth-roles/sprint.md) · Task: [00 — Schema Auth](../sprint/backlog/01-auth-roles/backend/00-schema-auth.md) · 📋 Added

**Event:** Task created
**Files:** `sprint/backlog/01-auth-roles/backend/00-schema-auth.md`
> Foundation: siaga_profiles 4 role, assignments, assisted_sessions, lockout + RLS (migration 0009).

<!-- ENTRY FORMAT:
### YYYY-MM-DD · [Sprint NN — slug](../sprint/active/NN-slug/sprint.md) · Task: [task title](../sprint/.../backend/NN-task.md) · STATUS

**Event:** Task created | Task completed | Files modified
**Files:** `path/to/route.py`, `path/to/migration.sql`
> One-line summary of what changed or was delivered.
-->
