import type {
  AbstainStatus,
  ConfidenceBand,
  RecommendationOrigin,
  TriageAnswer,
} from '@/types/siaga-triage'

/**
 * Indonesian display vocabulary for the triage surfaces (Sprint 05).
 *
 * The wording is part of the safety contract, not decoration: a farmer must be
 * able to tell "the system is fairly sure" from "the system does not know", so
 * the band and abstain copy state uncertainty plainly instead of softening it.
 */

export const CONFIDENCE_BAND_LABELS: Record<ConfidenceBand, string> = {
  tinggi: 'Keyakinan tinggi',
  sedang: 'Keyakinan sedang',
  rendah: 'Keyakinan rendah',
}

/** Band pill styling — semantic colour, not decorative. */
export const CONFIDENCE_BAND_CLASSES: Record<ConfidenceBand, string> = {
  tinggi: 'bg-success-light text-success-deep border-success-soft',
  sedang: 'bg-warning-light text-warning-deep border-warning-soft',
  rendah: 'bg-error-light text-error-deep border-error-soft',
}

export const ABSTAIN_LABELS: Record<AbstainStatus, string> = {
  yakin: '',
  tidak_yakin: 'Tidak Yakin',
  konflik: 'Konflik antar-foto',
}

export const ABSTAIN_ICONS: Record<AbstainStatus, string> = {
  yakin: 'ph-check-circle',
  tidak_yakin: 'ph-question',
  konflik: 'ph-arrows-split',
}

export const ANSWER_LABELS: Record<TriageAnswer, string> = {
  ya: 'Ya',
  tidak: 'Tidak',
  tidak_tahu: 'Tidak Tahu',
}

/** Order the answer buttons are rendered in — never changes between screens. */
export const ANSWER_OPTIONS: TriageAnswer[] = ['ya', 'tidak', 'tidak_tahu']

export const ORIGIN_LABELS: Record<RecommendationOrigin, string> = {
  ai_engine: '',
  rule_fallback: 'Mode terbatas',
  insufficient_evidence: 'Bukti tidak cukup',
}

/** Farmer card sections, in the order the brief specifies. */
export const FARMER_SECTIONS = [
  {
    key: 'lakukan',
    title: 'Lakukan sekarang',
    icon: 'ph-check-square',
    numbered: true,
  },
  { key: 'pantau', title: 'Pantau', icon: 'ph-eye', numbered: false },
  { key: 'hindari', title: 'Hindari', icon: 'ph-prohibit', numbered: false },
] as const

export type FarmerSectionKey = (typeof FARMER_SECTIONS)[number]['key']

/** Review-status copy driven by the case, shown above the cards. */
export function reviewStatusLabel(
  caseStatus: string,
  needsHumanReview: boolean
): string {
  if (caseStatus === 'REVISION_REQUIRED') return 'Perlu foto ulang'
  if (caseStatus === 'REVIEWED' || caseStatus === 'CLOSED') return 'Sudah direview'
  if (needsHumanReview || caseStatus === 'NEEDS_REVIEW') {
    return 'Menunggu review penyuluh'
  }
  return 'Hasil otomatis'
}

/** True when the card must lead with uncertainty rather than confident advice. */
export function isUncertainResult(
  band: ConfidenceBand,
  abstainStatus: AbstainStatus
): boolean {
  return band === 'rendah' || abstainStatus !== 'yakin'
}
