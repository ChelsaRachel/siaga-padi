import type {
  KbActionType,
  KbApprovalStatus,
  KbAudience,
  KbAvailabilityStatus,
  KbPolicyFlag,
  KbRisk,
  KbSourceStatus,
} from '@/types/siaga-kb'

/**
 * Indonesian labels + tag vocabulary for the knowledge-base UI.
 *
 * The tag lists MIRROR `apps/backend/models/siaga_kb.py` — the API rejects a
 * tag it does not know, so the reviewer's tag editor must offer exactly the
 * server's vocabulary, never free text.
 */

export const SOURCE_STATUS_LABELS: Record<KbSourceStatus, string> = {
  draf: 'Draf',
  disetujui: 'Disetujui',
  dipensiunkan: 'Dipensiunkan',
}

export const SOURCE_STATUS_ORDER: KbSourceStatus[] = [
  'draf',
  'disetujui',
  'dipensiunkan',
]

export const AVAILABILITY_LABELS: Record<KbAvailabilityStatus, string> = {
  tersedia: 'Tersedia daring',
  arsip: 'Salinan arsip',
  tidak_tersedia: 'Tidak tersedia',
}

export const APPROVAL_STATUS_LABELS: Record<KbApprovalStatus, string> = {
  menunggu: 'Menunggu review',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
}

export const AUDIENCE_LABELS: Record<KbAudience, string> = {
  petani: 'Petani',
  penyuluh: 'Penyuluh',
}

export const RISK_LABELS: Record<KbRisk, string> = {
  aman: 'Aman',
  dibatasi: 'Dibatasi',
}

export const POLICY_FLAG_LABELS: Record<KbPolicyFlag, string> = {
  memuat_dosis: 'Memuat dosis — tidak untuk dinarasikan',
  memuat_merek: 'Memuat merek — tidak untuk dinarasikan',
  memuat_dosis_dan_merek: 'Memuat dosis & merek — tidak untuk dinarasikan',
}

export const POLICY_FLAG_ORDER: KbPolicyFlag[] = [
  'memuat_dosis',
  'memuat_merek',
  'memuat_dosis_dan_merek',
]

export const ACTION_TYPE_LABELS: Record<KbActionType, string> = {
  kultur_teknis: 'Kultur teknis',
  kimiawi: 'Kimiawi',
  biologis: 'Biologis',
  pencegahan: 'Pencegahan',
  pemantauan: 'Pemantauan',
  eskalasi: 'Eskalasi',
}

export const ACTION_TYPE_ORDER: KbActionType[] = [
  'kultur_teknis',
  'kimiawi',
  'biologis',
  'pencegahan',
  'pemantauan',
  'eskalasi',
]

/** Disease vocabulary — keys must match the backend tag values exactly. */
export const DISEASE_LABELS: Record<string, string> = {
  blas_daun: 'Blas Daun',
  blas_leher: 'Blas Leher',
  hawar_daun_bakteri: 'Hawar Daun Bakteri',
  tungro: 'Tungro',
  kerdil_rumput: 'Kerdil Rumput',
  bercak_coklat: 'Bercak Coklat',
  busuk_batang: 'Busuk Batang',
  wereng_batang_coklat: 'Wereng Batang Coklat',
  penggerek_batang: 'Penggerek Batang',
  tikus_sawah: 'Tikus Sawah',
}

export const DISEASE_ORDER = Object.keys(DISEASE_LABELS)

export const PHASE_LABELS: Record<string, string> = {
  persemaian: 'Persemaian',
  vegetatif: 'Vegetatif (anakan)',
  generatif: 'Generatif (bunting)',
  pemasakan: 'Pemasakan',
}

export const PHASE_ORDER = Object.keys(PHASE_LABELS)

/** Unknown values fall back to the raw tag so nothing renders as blank. */
export function labelFor(map: Record<string, string>, value: string | null): string {
  if (!value) {
    return '—'
  }
  return map[value] ?? value
}

/** Indonesian long date, same presentation the case cards use. */
export function formatKbDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
