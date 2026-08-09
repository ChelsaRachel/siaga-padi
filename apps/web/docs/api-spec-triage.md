# API Spec — AI Triage (Sprint 05, pinned FE ↔ BE contract)

> Kontrak FR-005 / FR-006 / FR-007 (Triase & Rekomendasi AI). Semua respons
> memakai envelope BaseResponse yang sama dengan `api-spec-case.md`. Semua path
> di bawah relatif terhadap base `apps/`. JWT Bearer wajib.
>
> **Tiga invarian yang mengikat seluruh kontrak ini:**
> 1. **Hasil analisis beku.** Satu kasus punya paling banyak satu
>    `analysis_results`; UPDATE/DELETE ditolak database. Koreksi manusia adalah
>    versi review baru (Sprint 06), bukan penyuntingan hasil model.
> 2. **Jawaban tidak pernah mengubah label.** Kuesioner hanya menaikkan
>    `urgencyFlag` pada kasus — kolomnya ada di tabel `cases`, bukan di hasil
>    analisis.
> 3. **Nol saran tanpa rujukan.** Setiap butir saran mengutip minimal satu
>    `refCode` dari indeks aktif Sprint 04; rujukan kurang → `insufficient_evidence`
>    dan AI tidak dipanggil sama sekali.

## Peran

| Endpoint | petani (pemilik) | penyuluh (binaan) | admin / domain_reviewer |
|---|---|---|---|
| `POST cases/{id}/analysis` | ✅ | ✅ (bila pembuat assisted) | ❌ |
| `GET cases/{id}/analysis` | ✅ (tanpa skor) | ✅ (dengan skor) | ✅ (dengan skor) |
| `GET cases/{id}/questions` | ✅ | ✅ | ✅ |
| `POST cases/{id}/answers` | ✅ | ✅ (bila pembuat assisted) | ❌ |
| `POST cases/{id}/recommendation` | ✅ | ✅ (bila pembuat assisted) | ❌ |
| `GET cases/{id}/recommendation` | ✅ (tanpa `technicalView`) | ✅ | ✅ |

**Pembagian peran dilakukan di server.** Respons untuk petani DIBANGUN tanpa
skor, tanpa versi model, tanpa `evidenceMaps`, dan tanpa `technicalView` —
field-field itu bernilai `null`, bukan disembunyikan di UI.

Baca = pemilik kasus, penyuluh binaan wilayah, admin, domain_reviewer.
Tulis = pemilik kasus atau pembuatnya (mode pendampingan) saja.

## Shared types

```ts
type CvLabel = 'sehat' | 'blas_daun' | 'hawar_daun_bakteri' | 'bercak_coklat'
type ConfidenceBand = 'tinggi' | 'sedang' | 'rendah'
type AbstainStatus = 'yakin' | 'tidak_yakin' | 'konflik'
type TriageAnswer = 'ya' | 'tidak' | 'tidak_tahu'
type RecommendationOrigin = 'ai_engine' | 'rule_fallback' | 'insufficient_evidence'

interface AnalysisCandidate {
  label: CvLabel
  displayLabel: string
  /** Technical viewers only — null untuk petani. */
  calibratedScore: number | null
}

interface AnalysisResultOut {
  analysisId: string
  caseId: string
  /** Judul untuk petani; null saat sistem abstain. */
  indication: string | null
  confidenceBand: ConfidenceBand
  abstainStatus: AbstainStatus
  /** Penjelasan jujur, terisi saat abstainStatus ≠ 'yakin'. */
  abstainMessage: string | null
  requiresReview: boolean
  disclaimer: string
  /** Petani menerima kandidat teratas saja; penyuluh menerima maks 3. */
  candidates: AnalysisCandidate[]
  qualityPenalty: boolean | null
  modelVersion: string | null
  thresholdVersion: string | null
  /** Reviewer-only (Sprint 06 yang merender). */
  evidenceMaps: object[] | null
  createdAt: string | null
}

interface QuestionOut {
  questionId: string
  code: string
  text: string
  illustration: string | null
  whyAsked: string
  answer: TriageAnswer | null
}

interface QuestionSetOut {
  caseId: string
  questions: QuestionOut[]
  totalCount: number
  answeredCount: number
  questionBankVersion: string
  caseStatus: string
  caseDisplayStage: string
}

interface SuggestionOut {
  text: string
  /** Selalu ≥1 untuk butir tindakan — dijamin pemeriksa keamanan. */
  refCodes: string[]
}

interface RecommendationOut {
  recommendationId: string
  caseId: string
  analysisId: string
  origin: RecommendationOrigin
  farmerView: {
    indikasi: string
    lakukan: SuggestionOut[]
    pantau: SuggestionOut[]
    hindari: SuggestionOut[]
    eskalasi: string
  }
  /** Technical viewers only — null untuk petani. */
  technicalView: {
    ringkasan: string
    ketidakpastian: string
    kutipan: SuggestionOut[]
    penanda: string[]
  } | null
  refCodes: string[]
  caseStatus: string
  caseDisplayStage: string
  needsHumanReview: boolean
  urgencyFlag: boolean
  modelVersion: string | null
  thresholdVersion: string | null
  questionBankVersion: string | null
  providerVersion: string | null
  createdAt: string | null
  updatedAt: string | null
}
```

## Endpoints

### `POST cases/{caseId}/analysis`

Menjalankan pipeline CV. **Idempoten** — kasus yang sudah punya hasil
mengembalikan hasil itu apa adanya (baris beku, tidak pernah ada verdict kedua).

Body: `{}` (opsional `assistedSessionId`). Respons: `AnalysisResultOut`.

Transisi: `CAPTURED → QUEUED → PROCESSING_CV → NEEDS_CONTEXT`.

| Kondisi | Kode | Pesan |
|---|---|---|
| Foto layak < 2 | 400 | "Kasus belum siap dianalisis…" |
| Kasus sudah dieskalasi tanpa foto cukup | 400 | "Kasus ini sudah dikirim ke penyuluh…" |
| Bukan pemilik/pendamping | 403 | "Hanya pemilik kasus atau pendampingnya…" |
| Kasus tidak terlihat / tidak ada | 404 | "Kasus tidak ditemukan." |

`tidak_yakin` dan `konflik` adalah **hasil sah, bukan error** → HTTP 200,
`requiresReview: true`, `indication: null`, kasus ditandai wajib review, dan
kuesioner tetap berjalan.

### `GET cases/{caseId}/analysis`

Respons: `AnalysisResultOut`. `404` selama pipeline belum pernah dijalankan.

### `GET cases/{caseId}/questions`

Maks 5 pertanyaan dari bank **tervalidasi**, dipilih dari kandidat analisis +
fase tanaman. Deterministik: pertanyaan spesifik-penyakit dulu (urut `ordinal`),
lalu pertanyaan umum. Respons: `QuestionSetOut`. `404` bila analisis belum ada.

### `POST cases/{caseId}/answers`

Body:

```ts
{
  answers: Array<{ questionId: string; answer: TriageAnswer }>
  assistedSessionId?: string
}
```

Pengiriman **sebagian diperbolehkan** — pertanyaan yang tidak dijawab cukup
tidak disertakan. Upsert per `(caseId, questionId)`, jadi menjawab ulang
mengganti, bukan menduplikasi. Respons: `QuestionSetOut`.

Transisi: `NEEDS_CONTEXT → GENERATING_RECOMMENDATION`.

| Kondisi | Kode | Pesan |
|---|---|---|
| `answer` di luar vocab | 400 | "Jawaban harus 'ya', 'tidak', atau 'tidak_tahu'." |
| `questionId` di luar set terpilih | 400 | "Pertanyaan tidak dikenal untuk kasus ini." |
| Daftar jawaban kosong | 400 | "Tidak ada jawaban yang dikirim." |

Kombinasi jawaban berisiko (total bobot ≥ 3) menaikkan `urgencyFlag` pada kasus
— **label analisis tidak tersentuh**.

### `POST cases/{caseId}/recommendation`

Menyusun kartu. **Idempoten** — kasus yang sudah punya kartu mengembalikannya
tanpa memanggil penyedia lagi.

Alur: ambil rujukan aktif (disease kandidat teratas + fase) → bila hit < 2 →
`insufficient_evidence` **tanpa memanggil AI** → bila cukup → satu panggilan AI
terbatas → pemeriksa keamanan → gagal berulang → seam fallback aturan
(Sprint 07). Respons: `RecommendationOut`.

Transisi: `GENERATING_RECOMMENDATION → AUTO_TRIAGE_READY` (band tinggi, tanpa
abstain) atau `→ NEEDS_REVIEW`.

| Kondisi | Kode | Pesan |
|---|---|---|
| Kuesioner belum dikirim | 400 | "Jawab pertanyaan lanjutan terlebih dahulu." |
| Analisis belum ada | 404 | "Hasil analisis belum tersedia untuk kasus ini." |

### `GET cases/{caseId}/recommendation`

Respons: `RecommendationOut`. `404` selama kartu belum disusun — di FE ini
adalah **state normal**, dirender sebagai ajakan melanjutkan pemeriksaan.

## Pemeriksa keamanan (FR-007)

Setiap keluaran — termasuk kartu fallback — wajib lolos empat aturan:

1. **Bentuk**: `farmerView` + `technicalView` lengkap; keluaran cacat ditolak.
2. **Cakupan rujukan**: setiap butir tindakan punya ≥1 `refCode`, dan setiap
   kode harus benar-benar berasal dari hasil retrieval.
3. **Istilah terlarang**: nol dosis, nol merek, nol klaim diagnosis final di
   sisi petani. (Disclaimer "bukan diagnosis final" justru wajib — pemindai
   membedakan pernyataan dari penyangkalan.)
4. **Kebijakan narasi**: potongan ber-`policyFlag` (memuat dosis/merek) boleh
   ditautkan untuk penyuluh, tetapi **tidak pernah** dinarasikan ke petani.

## Data yang dikirim ke penyedia AI

Hanya tiga blok: ringkasan analisis, jawaban kuesioner, dan isi rujukan
tervalidasi. **Tanpa** nama, telepon, koordinat, kode kasus, wilayah, atau foto
mentah (brief 03 §5.3) — diuji di `tests/test_recommendation.py`.

## Reproduktibilitas

Setiap kartu menyimpan `modelVersion`, `thresholdVersion`,
`questionBankVersion`, dan `providerVersion` sehingga kasus lama selalu bisa
dijelaskan dengan konfigurasi yang benar-benar dipakai saat itu.

---

*Sprint 05 — Triase & Rekomendasi AI | FR-005, FR-006, FR-007*
