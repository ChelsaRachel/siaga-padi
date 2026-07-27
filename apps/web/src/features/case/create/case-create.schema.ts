import * as yup from 'yup'
import { FIELD_NAME_MAX, FIELD_NAME_MIN } from '@/features/case/fields'

const GROWTH_STAGES = ['SEEDLING', 'VEGETATIVE', 'REPRODUCTIVE', 'RIPENING', 'UNKNOWN'] as const
const LOCATION_MODES = ['EXACT_GPS', 'AREA_ONLY', 'NONE'] as const

/** Contract: observedAt must be ≤ now + 10 min clock skew. */
export const OBSERVED_AT_MAX_SKEW_MS = 10 * 60 * 1000

/* ── Step 1 — lahan ──────────────────────────────────────────────────────── */

export const wizardLahanSchema = yup
  .object({
    fieldMode: yup
      .string()
      .oneOf(['existing', 'new'], 'Pilih lahan atau buat lahan baru')
      .required('Pilih lahan atau buat lahan baru'),
    fieldId: yup.string().when('fieldMode', {
      is: 'existing',
      then: (schema) => schema.required('Pilih salah satu lahan Anda'),
      otherwise: (schema) => schema.optional().default(''),
    }),
    newFieldName: yup.string().when('fieldMode', {
      is: 'new',
      then: (schema) =>
        schema
          .trim()
          .min(FIELD_NAME_MIN, `Nama lahan minimal ${FIELD_NAME_MIN} karakter`)
          .max(FIELD_NAME_MAX, `Nama lahan maksimal ${FIELD_NAME_MAX} karakter`)
          .required('Nama lahan wajib diisi'),
      otherwise: (schema) => schema.optional().default(''),
    }),
    newFieldKabupaten: yup.string().trim().optional().default(''),
    newFieldKecamatan: yup.string().trim().optional().default(''),
  })
  .required()

export type TWizardLahanValues = yup.InferType<typeof wizardLahanSchema>

/* ── Step 2 — lokasi & fase ──────────────────────────────────────────────── */

export const wizardLokasiFaseSchema = yup
  .object({
    locationMode: yup
      .string()
      .oneOf([...LOCATION_MODES], 'Pilih cara menentukan lokasi')
      .required('Pilih cara menentukan lokasi'),
    areaKabupaten: yup.string().when('locationMode', {
      is: 'AREA_ONLY',
      then: (schema) => schema.trim().required('Kabupaten wajib diisi'),
      otherwise: (schema) => schema.optional().default(''),
    }),
    areaKecamatan: yup.string().when('locationMode', {
      is: 'AREA_ONLY',
      then: (schema) => schema.trim().required('Kecamatan wajib diisi'),
      otherwise: (schema) => schema.optional().default(''),
    }),
    growthStage: yup
      .string()
      .oneOf([...GROWTH_STAGES], 'Pilih fase pertumbuhan tanaman')
      .required('Pilih fase pertumbuhan tanaman'),
    observedAt: yup
      .string()
      .required('Waktu pengamatan wajib diisi')
      .test('not-far-future', 'Waktu pengamatan tidak boleh di masa depan', (value) => {
        if (!value) return false
        const parsed = new Date(value).getTime()
        if (Number.isNaN(parsed)) return false
        return parsed <= Date.now() + OBSERVED_AT_MAX_SKEW_MS
      }),
  })
  .required()

export type TWizardLokasiFaseValues = yup.InferType<typeof wizardLokasiFaseSchema>
