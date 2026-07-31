# API Spec — Case Photos (Sprint 03, pinned FE ↔ BE contract)

> Kontrak FR-003 / FR-004. Semua respons memakai envelope BaseResponse yang sama
> dengan `api-spec-case.md`. Semua path di bawah relatif terhadap base `apps/`.
> JWT Bearer wajib. Skor teknis kualitas TIDAK PERNAH dikirim ke klien — hanya
> status + maksimal 3 alasan sederhana.

## Shared types

```ts
type QualityStatus = 'layak' | 'ditolak' | 'ambang' | 'tidak_pasti'

type RejectReason =
  | 'buram'
  | 'gelap'
  | 'terlalu_jauh'
  | 'bukan_daun'
  | 'resolusi_rendah'

interface CasePhotoOut {
  photoId: string
  caseId: string
  slotNo: 1 | 2 | 3
  qualityStatus: QualityStatus
  /** Maks 3. Kosong saat layak/ambang. */
  rejectReasons: RejectReason[]
  /** Jumlah kegagalan sebelumnya pada slot ini saat foto ini diunggah. */
  retakeCount: number
  exifStripped: boolean
  /** Signed URL berumur pendek (bucket privat) — bisa null saat gagal ditandatangani. */
  signedUrl: string | null
  createdAt: string
}
```

## POST `cases/{caseId}/photos` — unggah + gerbang kualitas

Multipart form: `file` (JPEG/PNG/WebP, maks 10 MB) + `slotNo` (1–3).

- EXIF (termasuk GPS) dihapus dan ukuran dinormalisasi SEBELUM disimpan.
- Idempoten per KONTEN: sha256 bytes asli unik per kasus — kirim ulang bytes
  yang sama mengembalikan record yang sama (`replayed: true`), tanpa duplikat.
- `ambang` = diterima dengan peringatan (penalti keyakinan hilir, Sprint 05).
- ≥2 foto diterima (layak/ambang, slot berbeda) → kasus DRAFT→CAPTURED
  otomatis (event linimasa tercatat).

```ts
interface PhotoUploadOut {
  photo: CasePhotoOut
  replayed: boolean
  /** Slot berbeda yang sudah memuat foto diterima. */
  acceptedCount: number
  /** True setelah 3 kegagalan pada satu slot (dan minimum belum terpenuhi). */
  canEscalate: boolean
  caseStatus: string
  caseDisplayStage: string
}
```

Kegagalan: 400 (slot/format/ukuran/berkas rusak, kasus di luar tahap foto),
403 (bukan pemilik/pendamping), 404 (kasus tak terlihat — identik dgn tak ada).

## GET `cases/{caseId}/photos` — status foto kasus

Visibilitas mengikuti aturan baca kasus (owner / penyuluh binaan / admin).

```ts
interface CasePhotoListOut {
  photos: CasePhotoOut[]
  acceptedCount: number
  canEscalate: boolean
  needsHumanReview: boolean
  caseStatus: string
  caseDisplayStage: string
}
```

## POST `cases/{caseId}/photos/escalate` — "Kirim ke Penyuluh Saja"

Hanya sah setelah 3 kegagalan pada satu slot dan minimum foto belum
terpenuhi. Kasus DITANDAI `needsHumanReview` (bukan status baru), foto apa
adanya, TANPA label otomatis; status maju DRAFT→CAPTURED agar antre review
(Sprint 06 membaca penanda `kualitas_foto_rendah`).

```ts
interface EscalateOut {
  caseId: string
  needsHumanReview: boolean
  caseStatus: string
  caseDisplayStage: string
}
```

Kegagalan: 400 (belum 3× gagal / sudah ditandai), 403/404 seperti unggah.
