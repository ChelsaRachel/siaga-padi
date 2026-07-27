import type { DeletionRequestStatus, DisplayStage, GrowthStage, LocationMode } from '@/types/siaga-case'

/**
 * Shared Indonesian label maps for the `case` domain (wizard, lahan gallery,
 * riwayat, detail). Canonical values stay English per the contract; petani
 * only ever see these labels.
 */

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  SEEDLING: 'Semai',
  VEGETATIVE: 'Anakan / Vegetatif',
  REPRODUCTIVE: 'Bunting',
  RIPENING: 'Pengisian bulir',
  UNKNOWN: 'Belum tahu',
}

export interface IGrowthStageOption {
  value: GrowthStage
  label: string
  description: string
}

/** Ordered picker options — plain language, per Tani Ramah UX rule #5. */
export const GROWTH_STAGE_OPTIONS: IGrowthStageOption[] = [
  { value: 'SEEDLING', label: GROWTH_STAGE_LABELS.SEEDLING, description: 'Bibit masih di persemaian' },
  { value: 'VEGETATIVE', label: GROWTH_STAGE_LABELS.VEGETATIVE, description: 'Tanaman tumbuh daun dan anakan' },
  { value: 'REPRODUCTIVE', label: GROWTH_STAGE_LABELS.REPRODUCTIVE, description: 'Malai mulai terbentuk di dalam batang' },
  { value: 'RIPENING', label: GROWTH_STAGE_LABELS.RIPENING, description: 'Bulir terisi dan mulai menguning' },
  { value: 'UNKNOWN', label: GROWTH_STAGE_LABELS.UNKNOWN, description: 'Tidak apa-apa, bisa dilengkapi nanti' },
]

export const DISPLAY_STAGE_LABELS: Record<DisplayStage, string> = {
  draf: 'Draf',
  difoto: 'Difoto',
  diproses: 'Diproses',
  hasil_siap: 'Hasil Siap',
  direview: 'Direview',
  revisi: 'Revisi',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

/** Chip/filter order for riwayat — mirrors the contract's DisplayStage set. */
export const DISPLAY_STAGE_ORDER: DisplayStage[] = [
  'draf',
  'difoto',
  'diproses',
  'hasil_siap',
  'direview',
  'revisi',
  'selesai',
  'dibatalkan',
]

/**
 * Badge token classes per stage. Never color-only: the badge always carries
 * the Indonesian label text (Tani Ramah: no color-only severity).
 */
export const DISPLAY_STAGE_BADGE_CLASSES: Record<DisplayStage, string> = {
  draf: 'bg-neutral-light text-font-primary border-neutral-soft',
  difoto: 'bg-info-light text-info-deep border-info-soft',
  diproses: 'bg-secondary-light text-font-primary border-secondary-soft',
  hasil_siap: 'bg-primary-light text-primary-deep border-primary-soft',
  direview: 'bg-info-light text-info-deep border-info-soft',
  revisi: 'bg-warning-light text-warning-deep border-warning-soft',
  selesai: 'bg-primary-light text-primary-deep border-primary-soft',
  dibatalkan: 'bg-neutral-light text-font-secondary border-neutral-soft',
}

export const LOCATION_MODE_LABELS: Record<LocationMode, string> = {
  EXACT_GPS: 'Lokasi GPS',
  AREA_ONLY: 'Area (kabupaten/kecamatan)',
  NONE: 'Belum tahu',
}

export const DELETION_REQUEST_STATUS_LABELS: Record<DeletionRequestStatus, string> = {
  tercatat: 'Tercatat',
  diproses: 'Sedang diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
}
