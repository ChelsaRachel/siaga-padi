import { describe, expect, it } from 'vitest'
import type { ICaseWizardDraft } from '../store/useCaseWizardStore'
import { buildCaseCreatePayload } from './build-case-payload'

const BASE_DRAFT: ICaseWizardDraft = {
  fieldMode: 'existing',
  fieldId: 'field-1',
  fieldName: 'Sawah belakang rumah',
  newFieldName: '',
  newFieldKabupaten: '',
  newFieldKecamatan: '',
  locationMode: 'NONE',
  coords: null,
  areaKabupaten: '',
  areaKecamatan: '',
  growthStage: 'VEGETATIVE',
  observedAt: '2026-07-26T08:40',
}

describe('buildCaseCreatePayload', () => {
  it('"belum tahu" branch: locationMode NONE with NO coords and NO area keys', () => {
    // Act
    const payload = buildCaseCreatePayload(BASE_DRAFT, null)

    // Assert — exact contract shape for the NONE branch
    expect(payload.locationMode).toBe('NONE')
    expect(payload.fieldId).toBe('field-1')
    expect(payload.growthStage).toBe('VEGETATIVE')
    expect(typeof payload.observedAt).toBe('string')
    expect(payload).not.toHaveProperty('coords')
    expect(payload).not.toHaveProperty('areaKabupaten')
    expect(payload).not.toHaveProperty('areaKecamatan')
    expect(payload).not.toHaveProperty('newField')
    expect(payload).not.toHaveProperty('assistedSessionId')
  })

  it('AREA_ONLY branch carries kabupaten + kecamatan and never coords', () => {
    // Arrange
    const draft: ICaseWizardDraft = {
      ...BASE_DRAFT,
      locationMode: 'AREA_ONLY',
      areaKabupaten: 'Karawang',
      areaKecamatan: 'Rengasdengklok',
    }

    // Act
    const payload = buildCaseCreatePayload(draft, null)

    // Assert
    expect(payload.locationMode).toBe('AREA_ONLY')
    expect(payload.areaKabupaten).toBe('Karawang')
    expect(payload.areaKecamatan).toBe('Rengasdengklok')
    expect(payload).not.toHaveProperty('coords')
  })

  it('EXACT_GPS branch carries opt-in coords only', () => {
    // Arrange
    const draft: ICaseWizardDraft = {
      ...BASE_DRAFT,
      locationMode: 'EXACT_GPS',
      coords: { lat: -6.2, lng: 107.1 },
    }

    // Act
    const payload = buildCaseCreatePayload(draft, null)

    // Assert
    expect(payload.coords).toEqual({ lat: -6.2, lng: 107.1 })
    expect(payload).not.toHaveProperty('areaKabupaten')
  })

  it('new-lahan mode sends newField (mutually exclusive with fieldId)', () => {
    // Arrange
    const draft: ICaseWizardDraft = {
      ...BASE_DRAFT,
      fieldMode: 'new',
      fieldId: null,
      newFieldName: '  Sawah pojok  ',
      newFieldKabupaten: 'Karawang',
      newFieldKecamatan: '',
    }

    // Act
    const payload = buildCaseCreatePayload(draft, null)

    // Assert
    expect(payload.newField).toEqual({ name: 'Sawah pojok', areaKabupaten: 'Karawang' })
    expect(payload).not.toHaveProperty('fieldId')
  })

  it('assisted mode appends assistedSessionId so the case is owned by the subject', () => {
    // Act
    const payload = buildCaseCreatePayload(BASE_DRAFT, 'assist-1')

    // Assert
    expect(payload.assistedSessionId).toBe('assist-1')
  })
})
