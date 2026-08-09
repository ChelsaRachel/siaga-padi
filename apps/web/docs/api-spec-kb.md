# API Spec — Knowledge Base (Sprint 04, pinned FE ↔ BE contract)

> Kontrak FR-011 (Tata Kelola Pengetahuan & Citation). Semua respons memakai
> envelope BaseResponse yang sama dengan `api-spec-case.md`. Semua path di bawah
> relatif terhadap base `apps/`. JWT Bearer wajib kecuali disebut lain.
>
> **Dua invarian yang mengikat seluruh kontrak ini:**
> 1. Indeks aktif = potongan **disetujui + versi terkini + belum kedaluwarsa**
>    milik sumber yang **belum dipensiunkan**. Draf/ditolak tidak pernah bocor.
> 2. Perubahan isi membuat **versi baru** di bawah `refCode` yang sama —
>    tidak pernah menimpa. Kutipan lama tetap bisa dibuka.

## Peran

| Endpoint | admin | domain_reviewer | petani/penyuluh |
|---|---|---|---|
| Registrasi/edit/ingest/pensiun sumber | ✅ | ❌ | ❌ |
| Telusuri katalog, antrean, diff | ✅ | ✅ | ❌ |
| Setujui/tolak potongan | ❌ | ✅ | ❌ |
| Revisi potongan (versi baru) | ✅ | ✅ | ❌ |
| Pratinjau baca-saja per `refCode` | ✅ | ✅ | ✅ |
| Uji pengambilan | ✅ | ✅ | ❌ |
| `POST kb/retrieval` (runtime) | ✅ | ✅ | ❌ (via `X-Internal-Token`) |

## Shared types

```ts
type KbSourceStatus = 'draf' | 'disetujui' | 'dipensiunkan'
type KbAvailabilityStatus = 'tersedia' | 'arsip' | 'tidak_tersedia'
type KbApprovalStatus = 'menunggu' | 'disetujui' | 'ditolak'
type KbAudience = 'petani' | 'penyuluh'
type KbRisk = 'aman' | 'dibatasi'
type KbPolicyFlag = 'memuat_dosis' | 'memuat_merek' | 'memuat_dosis_dan_merek'

type KbActionType =
  | 'kultur_teknis' | 'kimiawi' | 'biologis'
  | 'pencegahan' | 'pemantauan' | 'eskalasi'

interface KbSourceOut {
  sourceId: string
  title: string
  publisher: string
  publishedDate: string | null
  editionVersion: string | null
  /** Dasar legal pemakaian — WAJIB terisi untuk setiap sumber. */
  licenseNote: string
  category: string | null
  sourceUrl: string | null
  status: KbSourceStatus
  availabilityStatus: KbAvailabilityStatus
  lastReviewedAt: string | null
  retiredAt: string | null
  /** Hitungan potongan versi terkini milik sumber ini. */
  chunkTotal: number
  chunkPending: number
  chunkApproved: number
  createdAt: string
}

interface KbChunkOut {
  chunkId: string
  /** Penanda stabil lintas versi — inilah yang dikutip kartu rekomendasi. */
  refCode: string            // "RUJ-BLAS-004"
  sourceId: string
  sourceTitle: string | null
  sourceVersion: string | null
  location: string | null    // "Hal. 12" | "§ Pengendalian"
  content: string
  diseaseTags: string[]
  phaseTags: string[]
  actionType: KbActionType | null
  audience: KbAudience
  risk: KbRisk
  policyFlag: KbPolicyFlag | null
  /** Penanda yang DIWAJIBKAN isi teks — persetujuan ditolak bila belum dipenuhi. */
  requiredPolicyFlag: KbPolicyFlag | null
  approvalStatus: KbApprovalStatus
  rejectReason: string | null
  version: number
  /** false = versi lama; UI menampilkan label "versi lama — sudah diperbarui". */
  isCurrent: boolean
  validUntil: string | null
  decidedAt: string | null
  createdAt: string
}
```

## POST `kb/sources` — registrasi sumber (admin)

Body `RegisterKbSourceDTO`; `content` opsional — bila diisi, sistem langsung
memecah teks menjadi potongan.

```ts
{
  title: string            // 3-300
  publisher: string        // 2-200
  licenseNote: string      // 3-500, WAJIB
  publishedDate?: string
  editionVersion?: string
  category?: string
  sourceUrl?: string
  availabilityStatus?: KbAvailabilityStatus
  content?: string         // teks dokumen (opsional)
}
```

```ts
interface RegisterKbSourceOut {
  source: KbSourceOut
  /** null saat registrasi tanpa `content`. */
  ingest: KbIngestOut | null
}

interface KbIngestOut {
  sourceId: string
  chunkCount: number
  /** SELALU sama dengan chunkCount — ingest tidak pernah menyetujui apa pun. */
  pendingCount: number
  refCodes: string[]
}
```

Kegagalan: 400 (judul/penerbit/lisensi kosong, dokumen tak terbaca), 403 (bukan admin).

## POST `kb/sources/get-all` — katalog (admin, domain_reviewer)

FindDTO `{ page, limit, filters }`; filter: `status`, `publisher`,
`availabilityStatus`, `query`. Respons: `KbSourceOut[]` + `metaData.pagination`.

## GET `kb/sources/{sourceId}` — detail sumber (admin, domain_reviewer)

## PATCH `kb/sources/{sourceId}` — edit metadata (admin)

Semua field opsional; `markReviewed: true` menstempel "terakhir ditinjau".
Status siklus hidup TIDAK diubah lewat sini — gunakan `retire`.

## POST `kb/sources/{sourceId}/ingest` — ekstrak & pecah (admin)

**multipart/form-data**: `file` (PDF/teks/markdown, maks 10 MB) **ATAU** `content` (teks).
Lokasi potongan mengikuti sumbernya: `Hal. N` untuk PDF, `§ Judul` untuk markdown.
Respons `KbIngestOut`. Potongan baru selalu berstatus `menunggu`.

Kegagalan: 400 (tak ada berkas/teks, format tak didukung, PDF hasil pindaian
tanpa teks, sumber sudah dipensiunkan), 403, 404.

## POST `kb/sources/{sourceId}/retire` — pensiunkan (admin)

Body `{ reason?: string }`. Sumber keluar dari indeks aktif; potongannya TETAP
bisa dibuka lewat `kb/chunks/ref/{refCode}` agar kutipan kasus lama tidak putus.
Respons `KbSourceOut` (`status: 'dipensiunkan'`).

## POST `kb/chunks/get-all` — antrean review (admin, domain_reviewer)

FindDTO `{ page, limit, filters }`; filter: `sourceId`, `approvalStatus`,
`disease`, `phase`, `audience`, `refCode`, `policyFlagged`, `isCurrent`
(default `true` — antrean menampilkan versi terkini).
Respons: `KbChunkOut[]` + `metaData.pagination`.

## GET `kb/chunks/{chunkId}` — detail potongan (admin, domain_reviewer)

## GET `kb/chunks/ref/{refCode}?version=` — pratinjau baca-saja (semua peran login)

Tanpa `version` → versi terkini. Dengan `version` → baris historis persis, dengan
`isCurrent: false` sebagai pemicu label "versi lama — sudah diperbarui/dipensiunkan".
Target tautan laci rujukan Modul 03 (Sprint 05).

## GET `kb/chunks/ref/{refCode}/diff?baseVersion=&compareVersion=` — banding versi

Default: dua versi terakhir.

```ts
interface KbChunkDiffOut {
  refCode: string
  base: KbChunkVersionOut
  compare: KbChunkVersionOut
  /** Nama field yang berbeda, termasuk 'content'. */
  changedFields: string[]
  contentDiff: Array<{ op: '=' | '-' | '+'; text: string }>
}
```

## POST `kb/chunks/{chunkId}/approve` — setujui (domain_reviewer)

Koreksi penanda ikut dikirim bersama keputusan.

```ts
{
  policyFlag?: KbPolicyFlag
  diseaseTags?: string[]
  phaseTags?: string[]
  actionType?: KbActionType
  audience?: KbAudience
  risk?: KbRisk
  validUntil?: string
  note?: string
}
```

**Gerbang kebijakan:** bila ISI potongan memuat dosis/merek dan `policyFlag`
belum terisi (baik dari body maupun dari baris), API menolak dengan 400
*"Potongan memuat dosis/merek — wajib diberi penanda kebijakan sebelum disetujui."*
Pemeriksaan membaca ulang teksnya, bukan saran hasil ingest.

Persetujuan pertama pada sebuah sumber menaikkan statusnya `draf` → `disetujui`.

## POST `kb/chunks/{chunkId}/reject` — tolak (domain_reviewer)

Body `{ reason: string }` — **WAJIB**; 400 bila kosong.

## POST `kb/chunks/{chunkId}/revise` — versi baru (admin, domain_reviewer)

Body `ReviseKbChunkDTO` (`content`, tag, `policyFlag`, `note`). Menulis BARIS
BARU `version + 1` di bawah `refCode` yang sama berstatus `menunggu`; baris lama
menjadi `isCurrent: false` dengan isi utuh. Keputusan hanya sah pada versi
terkini — 400 bila potongan sudah digantikan.

## POST `kb/retrieval` — pengambilan runtime (X-Internal-Token / admin / reviewer)

Dipanggil mesin rekomendasi Sprint 05 tanpa identitas pengguna.

## POST `kb/retrieval-test` — uji pengambilan (admin, domain_reviewer)

Body sama; dicatat pada kanal `uji` sehingga tidak mencemari catatan runtime.

```ts
{
  disease?: string
  phase?: string
  audience?: KbAudience
  actionType?: KbActionType
  limit?: number
}
```

```ts
interface KbRetrievalOut {
  disease: string | null
  phase: string | null
  audience: KbAudience | null
  actionType: KbActionType | null
  hits: KbRetrievalHitOut[]
  totalCount: number
}

interface KbRetrievalHitOut {
  refCode: string
  chunkId: string
  sourceTitle: string | null
  location: string | null
  content: string
  diseaseTags: string[]
  phaseTags: string[]
  actionType: KbActionType | null
  audience: KbAudience
  risk: KbRisk
  policyFlag: KbPolicyFlag | null
  /** false untuk potongan berpenanda kebijakan: boleh ditautkan, tidak pernah dinarasikan. */
  narratable: boolean
  score: number
}
```

Aturan pemeringkatan (deterministik — kombinasi query yang sama selalu
menghasilkan urutan yang sama, sehingga uji pengambilan bisa dijadikan bukti):

| Sinyal | Skor |
|---|---|
| Penyakit cocok | 100 |
| Fase cocok | 30 |
| Jenis tindakan cocok | 20 |
| Audiens cocok | 10 |
| Potongan umum (tanpa penanda penyakit) | 5 |

- Query berpenyakit **menolak** potongan bertanda penyakit lain; potongan umum tetap lolos sebagai cadangan.
- Query `audience: 'petani'` tidak pernah memunculkan materi khusus penyuluh.
- Skor sama → diurutkan menaik berdasarkan `refCode`.
- Log pengambilan menyimpan **penanda rujukan + faset query saja**, tidak pernah isi permintaan.
