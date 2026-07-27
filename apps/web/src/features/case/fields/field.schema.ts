import * as yup from 'yup'

export const FIELD_NAME_MIN = 2
export const FIELD_NAME_MAX = 100

/** Lahan add/edit form — free naming 2–100 chars, area optional (contract). */
export const fieldSchema = yup
  .object({
    name: yup
      .string()
      .trim()
      .min(FIELD_NAME_MIN, `Nama lahan minimal ${FIELD_NAME_MIN} karakter`)
      .max(FIELD_NAME_MAX, `Nama lahan maksimal ${FIELD_NAME_MAX} karakter`)
      .required('Nama lahan wajib diisi'),
    areaKabupaten: yup.string().trim().optional().default(''),
    areaKecamatan: yup.string().trim().optional().default(''),
  })
  .required()

export type TFieldFormValues = yup.InferType<typeof fieldSchema>
