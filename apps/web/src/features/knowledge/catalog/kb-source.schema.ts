import * as yup from 'yup'

/**
 * Source registration form — bounds mirror the API (docs/api-spec-kb.md).
 * `licenseNote` is required on the client for the same reason it is NOT NULL
 * in the schema: brief 06 §6.2 wants the legal basis recorded for every
 * source, public government documents included.
 */

export const TITLE_MIN = 3
export const TITLE_MAX = 300
export const PUBLISHER_MIN = 2
export const PUBLISHER_MAX = 200
export const LICENSE_MIN = 3
export const LICENSE_MAX = 500

const AVAILABILITY_STATUSES = ['tersedia', 'arsip', 'tidak_tersedia'] as const

export const kbSourceSchema = yup
  .object({
    title: yup
      .string()
      .trim()
      .min(TITLE_MIN, `Judul minimal ${TITLE_MIN} karakter`)
      .max(TITLE_MAX, `Judul maksimal ${TITLE_MAX} karakter`)
      .required('Judul dokumen wajib diisi'),
    publisher: yup
      .string()
      .trim()
      .min(PUBLISHER_MIN, `Penerbit minimal ${PUBLISHER_MIN} karakter`)
      .max(PUBLISHER_MAX, `Penerbit maksimal ${PUBLISHER_MAX} karakter`)
      .required('Penerbit wajib diisi'),
    publishedDate: yup.string().trim().optional().default(''),
    editionVersion: yup.string().trim().optional().default(''),
    licenseNote: yup
      .string()
      .trim()
      .min(LICENSE_MIN, `Catatan lisensi minimal ${LICENSE_MIN} karakter`)
      .max(LICENSE_MAX, `Catatan lisensi maksimal ${LICENSE_MAX} karakter`)
      .required('Catatan lisensi/izin pakai wajib diisi'),
    category: yup.string().trim().optional().default(''),
    sourceUrl: yup
      .string()
      .trim()
      .url('Tautan sumber tidak valid')
      .optional()
      .default(''),
    availabilityStatus: yup
      .string()
      .oneOf(AVAILABILITY_STATUSES, 'Status ketersediaan tidak dikenal')
      .required()
      .default('tersedia'),
    /** Optional here: the admin may attach the document file instead. */
    content: yup.string().optional().default(''),
  })
  .required()

export type TKbSourceFormValues = yup.InferType<typeof kbSourceSchema>

/** Step order of the registration form (brief 06 §2.1 — form bertahap). */
export const KB_SOURCE_FORM_STEPS = [
  {
    id: 'identitas',
    label: 'Identitas dokumen',
    fields: ['title', 'publisher', 'publishedDate', 'editionVersion'],
  },
  {
    id: 'lisensi',
    label: 'Lisensi & ketersediaan',
    fields: ['licenseNote', 'availabilityStatus', 'sourceUrl'],
  },
  { id: 'dokumen', label: 'Kategori & dokumen', fields: ['category', 'content'] },
] as const

export type TKbSourceStepId = (typeof KB_SOURCE_FORM_STEPS)[number]['id']
