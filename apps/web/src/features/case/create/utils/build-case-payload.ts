import type { ICaseCreatePayload, ICaseNewFieldPayload } from '@/services/cases.service'
import type { ICaseWizardDraft } from '../store/useCaseWizardStore'

/**
 * Maps the wizard draft to the exact POST apps/cases body
 * (docs/api-spec-case.md). Pure function — unit-tested for every location
 * branch, including "belum tahu" (locationMode NONE: no coords, no area).
 */
export function buildCaseCreatePayload(
  draft: ICaseWizardDraft,
  assistedSessionId: string | null
): ICaseCreatePayload {
  const locationMode = draft.locationMode ?? 'NONE'

  const base: ICaseCreatePayload = {
    locationMode,
    growthStage: draft.growthStage ?? 'UNKNOWN',
    observedAt: new Date(draft.observedAt).toISOString(),
  }

  const withField = appendFieldChoice(base, draft)
  const withLocation = appendLocationDetail(withField, draft)

  return assistedSessionId ? { ...withLocation, assistedSessionId } : withLocation
}

/** `fieldId` and `newField` are mutually exclusive — never send both. */
function appendFieldChoice(payload: ICaseCreatePayload, draft: ICaseWizardDraft): ICaseCreatePayload {
  if (draft.fieldMode === 'existing' && draft.fieldId) {
    return { ...payload, fieldId: draft.fieldId }
  }

  if (draft.fieldMode === 'new' && draft.newFieldName.trim().length > 0) {
    const newField: ICaseNewFieldPayload = {
      name: draft.newFieldName.trim(),
      ...(draft.newFieldKabupaten.trim() ? { areaKabupaten: draft.newFieldKabupaten.trim() } : {}),
      ...(draft.newFieldKecamatan.trim() ? { areaKecamatan: draft.newFieldKecamatan.trim() } : {}),
    }
    return { ...payload, newField }
  }

  return payload
}

function appendLocationDetail(payload: ICaseCreatePayload, draft: ICaseWizardDraft): ICaseCreatePayload {
  if (payload.locationMode === 'EXACT_GPS' && draft.coords) {
    return { ...payload, coords: draft.coords }
  }

  if (payload.locationMode === 'AREA_ONLY') {
    return {
      ...payload,
      areaKabupaten: draft.areaKabupaten.trim(),
      areaKecamatan: draft.areaKecamatan.trim(),
    }
  }

  // "Belum tahu" (NONE): no coords, no area — GPS refusal never blocks creation.
  return payload
}
