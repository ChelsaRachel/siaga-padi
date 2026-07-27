import { create } from 'zustand'
import {
  farmerProfileService,
  type IFieldCreatePayload,
  type IFieldUpdatePayload,
} from '@/services/farmer-profile.service'
import type { SiagaField } from '@/types/siaga-case'
import { parseApiError } from '@/utils/parse-api-error'

const FIELDS_PAGE_LIMIT = 100

/**
 * Own-lahan list shared by the profile gallery and the case wizard step 1.
 * Not persisted — refetched on open so `lastGrowthStage`/`caseCount` stay
 * honest. All mutations are immutable (new arrays, never in-place).
 */
interface FieldsStore {
  fields: SiagaField[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  fetchFields: () => Promise<void>
  createField: (payload: IFieldCreatePayload) => Promise<SiagaField | null>
  updateField: (payload: IFieldUpdatePayload) => Promise<SiagaField | null>
  clearError: () => void
}

export const useFieldsStore = create<FieldsStore>((set) => ({
  fields: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchFields: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await farmerProfileService.getFields({ page: 1, limit: FIELDS_PAGE_LIMIT })
      set({ fields: Array.isArray(response?.data) ? response.data : [] })
    } catch (fetchError: unknown) {
      set({ error: parseApiError(fetchError).message })
    } finally {
      set({ isLoading: false })
    }
  },

  createField: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const response = await farmerProfileService.createField(payload)
      const created = response?.data
      if (!created?.fieldId) {
        set({ error: 'Lahan tidak dapat disimpan. Coba lagi.' })
        return null
      }
      set((state) => ({ fields: [created, ...state.fields] }))
      return created
    } catch (createError: unknown) {
      set({ error: parseApiError(createError).message })
      return null
    } finally {
      set({ isSaving: false })
    }
  },

  updateField: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const response = await farmerProfileService.updateField(payload)
      const updated = response?.data
      if (!updated?.fieldId) {
        set({ error: 'Perubahan lahan tidak dapat disimpan. Coba lagi.' })
        return null
      }
      set((state) => ({
        fields: state.fields.map((field) => (field.fieldId === updated.fieldId ? updated : field)),
      }))
      return updated
    } catch (updateError: unknown) {
      set({ error: parseApiError(updateError).message })
      return null
    } finally {
      set({ isSaving: false })
    }
  },

  clearError: () => set({ error: null }),
}))
