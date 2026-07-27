import * as yup from 'yup'

const DISPLAY_NAME_MIN = 2
const DISPLAY_NAME_MAX = 100

/**
 * Profile edit form — nama panggilan + area + consent toggles.
 * Deliberately NO national-ID field (privacy by design, per contract).
 */
export const profileSchema = yup
  .object({
    displayName: yup
      .string()
      .trim()
      .min(DISPLAY_NAME_MIN, `Nama panggilan minimal ${DISPLAY_NAME_MIN} karakter`)
      .max(DISPLAY_NAME_MAX, `Nama panggilan maksimal ${DISPLAY_NAME_MAX} karakter`)
      .required('Nama panggilan wajib diisi'),
    areaKabupaten: yup.string().trim().optional().default(''),
    areaKecamatan: yup.string().trim().optional().default(''),
    locationConsent: yup.boolean().required(),
    researchConsent: yup.boolean().required(),
  })
  .required()

export type TProfileFormValues = yup.InferType<typeof profileSchema>
