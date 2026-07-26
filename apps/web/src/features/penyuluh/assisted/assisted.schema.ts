import * as yup from 'yup'

const CONSENT_METHODS = ['lisan', 'tertulis', 'in_app'] as const

const consentMethodField = yup
  .string()
  .oneOf([...CONSENT_METHODS], 'Pilih metode persetujuan')
  .required('Metode persetujuan wajib dipilih')

/** Consent-only step (existing petani selected from search). */
export const consentSchema = yup
  .object({
    consentMethod: consentMethodField,
  })
  .required()

export type TConsentFormValues = yup.InferType<typeof consentSchema>

/**
 * Minimal profile — nama panggilan + area + consent.
 * Deliberately NO national-ID field (privacy by design, per contract).
 */
export const minimalProfileSchema = yup
  .object({
    displayName: yup
      .string()
      .min(2, 'Nama panggilan minimal 2 karakter')
      .required('Nama panggilan wajib diisi'),
    areaKabupaten: yup.string().required('Kabupaten wajib diisi'),
    areaKecamatan: yup.string().required('Kecamatan wajib diisi'),
    consentMethod: consentMethodField,
  })
  .required()

export type TMinimalProfileFormValues = yup.InferType<typeof minimalProfileSchema>
