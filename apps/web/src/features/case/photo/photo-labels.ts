import type { QualityStatus, RejectReason } from '@/types/siaga-photo'

/**
 * Petani-facing Indonesian labels + retake tips for the photo-quality flow.
 * Canonical reason/status values stay as the contract defines them; users
 * only ever see these labels — never technical scores (FR-004).
 */

export const QUALITY_STATUS_LABELS: Record<QualityStatus, string> = {
  layak: 'Layak',
  ditolak: 'Perlu Foto Ulang',
  ambang: 'Diterima dengan Catatan',
  tidak_pasti: 'Belum Bisa Dinilai',
}

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  buram: 'Foto buram',
  gelap: 'Kurang cahaya',
  terlalu_jauh: 'Terlalu jauh dari daun',
  bukan_daun: 'Daun tidak terlihat jelas',
  resolusi_rendah: 'Resolusi foto rendah',
}

export interface IRetakeTip {
  /** Actionable, plain-language fix. */
  tip: string
  /** "Sebelum" example description (what went wrong). */
  before: string
  /** "Sesudah" example description (what good looks like). */
  after: string
  /** Phosphor icon name (without `ph-` prefix). */
  icon: string
}

/** Reason-specific retake guidance with before/after examples (FR-004). */
export const RETAKE_TIPS: Record<RejectReason, IRetakeTip> = {
  buram: {
    tip: 'Pegang ponsel dengan dua tangan, ketuk daun di layar, dan tunggu sampai fokus sebelum menjepret.',
    before: 'Daun tampak kabur dan garis tepinya tidak jelas.',
    after: 'Urat daun terlihat tajam dan jelas.',
    icon: 'hand-grabbing',
  },
  gelap: {
    tip: 'Pindah ke tempat lebih terang atau hadapkan daun ke arah cahaya. Hindari membelakangi matahari.',
    before: 'Foto gelap, warna daun tidak kelihatan.',
    after: 'Daun terang merata dan warnanya jelas.',
    icon: 'sun',
  },
  terlalu_jauh: {
    tip: 'Dekatkan kamera sampai daun memenuhi bingkai panduan di layar.',
    before: 'Daun kecil di tengah, banyak latar belakang.',
    after: 'Satu daun memenuhi hampir seluruh bingkai.',
    icon: 'arrows-in',
  },
  bukan_daun: {
    tip: 'Pastikan yang difoto adalah daun padi, memenuhi bingkai, tanpa benda lain yang menutupi.',
    before: 'Objek lain atau latar mendominasi foto.',
    after: 'Daun padi jelas menjadi objek utama foto.',
    icon: 'leaf',
  },
  resolusi_rendah: {
    tip: 'Gunakan kamera bawaan tanpa zoom digital, lalu ambil ulang foto.',
    before: 'Foto pecah saat dilihat lebih dekat.',
    after: 'Foto tetap jelas saat diperbesar.',
    icon: 'magnifying-glass-plus',
  },
}

/** Static shooting tips shown in the camera overlay. */
export const CAMERA_TIPS = ['Isi bingkai dengan satu daun', 'Cari cahaya terang, hindari bayangan', 'Tahan ponsel sampai fokus'] as const

export const PRIVACY_NOTE = 'Data lokasi pada foto (EXIF) dihapus otomatis sebelum tersimpan.'

/** Copy rule: never claim server receipt before confirmation. */
export const UPLOAD_STATE_LABELS = {
  mengirim: 'Mengirim…',
  menunggu_jaringan: 'Menunggu jaringan — foto tersimpan di perangkat',
  terkirim: 'Terkirim',
  gagal: 'Gagal terkirim — foto masih di perangkat',
} as const
