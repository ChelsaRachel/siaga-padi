# Sprint 04 — Knowledge Base Governance

**Status:** ✅ Done
**Created At:** 2026-07-25
**Started At:** 2026-08-08
**Completed At:** 2026-08-08

## Goal

Admin mendaftarkan sumber resmi (BB Padi, Balai POPT, IRRI), sistem memecah jadi potongan rujukan berpenanda stabil, domain reviewer menyetujui per potongan (dengan penanda kebijakan untuk konten dosis/merek), dan uji pengambilan memverifikasi indeks — brief [`06_TATA_KELOLA_PENGETAHUAN.md`](../../../brief/06_TATA_KELOLA_PENGETAHUAN.md) (FR-011).

## Acceptance

- Sumber terdaftar → potongan dihasilkan → hanya potongan **disetujui + belum kedaluwarsa** masuk indeks aktif; draf tidak pernah bocor.
- Setiap potongan punya penanda stabil (mis. `RUJ-BLAS-004`), versi, lokasi halaman/bagian; perubahan membuat versi baru, tidak menimpa.
- Potongan bermuatan dosis/merek wajib penanda kebijakan "tidak untuk dinarasikan".
- Uji pengambilan: kombinasi penyakit/fase mengembalikan potongan yang tepat sebelum versi diaktifkan.

## Scope (stacks involved)

- [x] frontend → see [`frontend/`](./frontend/)
- [x] backend → see [`backend/`](./backend/)

## Workforce members touched

No agent workforce; kurasi manual MVP (tanpa crawler). `be_service` (ingest/index/governance), `fe_shell` (katalog + review + uji).

## Cross-stack dependencies

`backend/00-schema-kb.md` is the foundation. The retrieval index contract feeds Sprint 05's recommendation engine — that is the reason this sprint precedes triage. KB version activation approval (orang kedua) formalizes in Sprint 08; until then activation is admin-only with audit.

## Dependency graph

```
backend/00-schema-kb.md (foundation)
    ↓
    ├─ backend/01-kb-ingest-retrieval.md
    ├─ backend/02-kb-governance-routes.md
    │      ↓
    │      ├─ frontend/01-source-catalog.md
    │      └─ frontend/02-chunk-review-retrieval.md
```

## Notes

- Catat lisensi/izin pakai per sumber (konsolidasi data eksternal, brief 00 § Konsolidasi).

## Outcome

Semua 5 task selesai pada 2026-08-08. **Backend:** migration `0012_knowledge_base.sql` (`kb_sources`, `kb_chunks`, `kb_audit_events`, `kb_retrieval_logs` + view `kb_active_chunks` sebagai satu-satunya definisi indeks aktif, trigger anti-tulis-ulang isi & audit append-only, RLS kurator vs pembaca kutipan); pipeline ingest PDF/teks → potongan berlokasi (`Hal. N` / `§ Judul`) dengan auto-tag + ref code stabil `RUJ-BLAS-004`, semua mendarat `menunggu`; pengambilan terperingkat deterministik dengan `policyFlag`/`narratable` ikut tiap hit dan log hanya berisi ref code; tata kelola dengan gerbang kebijakan yang membaca ulang isi (setujui potongan dosis tanpa penanda ditolak 400), alasan tolak wajib, revisi = versi baru di bawah ref code yang sama, pensiun sumber keluar dari indeks tanpa memutus kutipan lama, dan jejak audit tiap keputusan. 196 pytest hijau (58 baru). **Frontend:** katalog sumber `/pengetahuan` (tabel + lisensi + tally menunggu, filter, form pendaftaran bertahap yang memicu pemecahan, dialog pensiun), ruang kerja reviewer `/pengetahuan/review` (antrean → pratinjau → bar keputusan dengan alasan wajib + kontrol penanda kebijakan, banding versi, panel uji pengambilan), dan pratinjau baca-saja `/pengetahuan/rujukan/:refCode` untuk semua peran login (mendukung versi historis + label "versi lama"). Menu config-driven untuk admin & domain reviewer. 204 vitest hijau (17 baru), tsc bersih. Kontrak dipin di `apps/web/docs/api-spec-kb.md`.

✅ **Verifikasi live (2026-08-09):** migration 0012 diterapkan ke stack Supabase lokal tanpa error, lalu seluruh alur diuji terhadap backend yang berjalan di tmux `siaga-padi`: daftar sumber + ingest → 2 potongan `menunggu` → gerbang kebijakan menolak persetujuan potongan berdosis tanpa penanda (400) dan menerimanya setelah diberi penanda → alasan tolak wajib → uji pengambilan mengembalikan rujukan yang tepat dengan `narratable:false` untuk konten berpenanda → revisi membuat versi 2 di bawah ref yang sama dan versi lama tak bisa diputuskan lagi → diff, pratinjau baca-saja `?version=1` berlabel "versi lama", pensiun sumber mengosongkan indeks tanpa memutus kutipan. 38 pemeriksaan live hijau; 0 traceback / 0 respons 500 di pane backend. UI diverifikasi di browser: katalog, antrean+bar keputusan (reviewer), diff, panel uji pengambilan, dan rute rujukan baca-saja render tanpa error konsol. Data uji dibersihkan setelahnya.

---

> **Ref:** [Sprint Planning](../../01-sprint-planning.md) | Brief: [`../../../brief/06_TATA_KELOLA_PENGETAHUAN.md`](../../../brief/06_TATA_KELOLA_PENGETAHUAN.md)
