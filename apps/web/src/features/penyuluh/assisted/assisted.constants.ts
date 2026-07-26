import type { ConsentMethod } from '@/types/siaga-auth'

export interface IConsentMethodOption {
  value: ConsentMethod
  label: string
  description: string
}

/** Consent methods per the contract (docs/api-spec.md § assisted/start). */
export const CONSENT_METHOD_OPTIONS: IConsentMethodOption[] = [
  {
    value: 'lisan',
    label: 'Lisan',
    description: 'Petani menyetujui secara lisan saat didampingi',
  },
  {
    value: 'tertulis',
    label: 'Tertulis',
    description: 'Petani menandatangani formulir persetujuan',
  },
  {
    value: 'in_app',
    label: 'Dalam aplikasi',
    description: 'Petani menyetujui langsung lewat aplikasi',
  },
]

export const SEARCH_SCOPE_NOTE =
  'Hasil pencarian hanya mencakup petani di wilayah binaan Anda (dibatasi oleh server).'
