import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/farmer-profile.service', () => ({
  farmerProfileService: {
    updateProfile: vi.fn(),
    createField: vi.fn(),
    updateField: vi.fn(),
    getFields: vi.fn(),
    requestDeletion: vi.fn(),
    getDeletionRequest: vi.fn(),
  },
}))

import { farmerProfileService } from '@/services/farmer-profile.service'
import { useAssistedStore } from '@/stores/useAssistedStore'
import type { SiagaApiResponse } from '@/types/api'
import type { SiagaField } from '@/types/siaga-case'
import { useFieldsStore } from '../store/useFieldsStore'
import { FieldFormDialog } from './FieldFormDialog'

function envelope<T>(data: T): SiagaApiResponse<T> {
  return {
    metaData: { status: true, executionTime: 1, responseCode: 200, message: 'Success' },
    data,
    additionalInfo: null,
    copyright: 'siaga-padi',
  }
}

const SAVED_FIELD: SiagaField = {
  fieldId: 'field-1',
  ownerProfileId: 'profile-1',
  name: 'Sawah pojok',
  areaKabupaten: null,
  areaKecamatan: null,
  coords: null,
  lastGrowthStage: null,
  caseCount: 0,
  createdAt: '2026-07-26T00:00:00Z',
  updatedAt: '2026-07-26T00:00:00Z',
}

describe('FieldFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFieldsStore.setState({ fields: [], isLoading: false, isSaving: false, error: null })
    useAssistedStore.getState().clearSession()
  })

  it('rejects a lahan name shorter than 2 characters', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<FieldFormDialog open onOpenChange={vi.fn()} />)

    // Act
    await user.type(screen.getByLabelText('Nama lahan'), 'A')
    await user.click(screen.getByRole('button', { name: /simpan lahan/i }))

    // Assert
    expect(await screen.findByText('Nama lahan minimal 2 karakter')).toBeInTheDocument()
    expect(farmerProfileService.createField).not.toHaveBeenCalled()
  })

  it('rejects a lahan name longer than 100 characters', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<FieldFormDialog open onOpenChange={vi.fn()} />)
    const longName = 'x'.repeat(101)

    // Act
    await user.click(screen.getByLabelText('Nama lahan'))
    await user.paste(longName)
    await user.click(screen.getByRole('button', { name: /simpan lahan/i }))

    // Assert
    expect(await screen.findByText('Nama lahan maksimal 100 karakter')).toBeInTheDocument()
    expect(farmerProfileService.createField).not.toHaveBeenCalled()
  })

  it('creates a lahan with a valid name and closes the dialog', async () => {
    // Arrange
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.mocked(farmerProfileService.createField).mockResolvedValue(envelope(SAVED_FIELD))
    render(<FieldFormDialog open onOpenChange={onOpenChange} />)

    // Act
    await user.type(screen.getByLabelText('Nama lahan'), 'Sawah pojok')
    await user.click(screen.getByRole('button', { name: /simpan lahan/i }))

    // Assert
    await waitFor(() => {
      expect(farmerProfileService.createField).toHaveBeenCalledWith({ name: 'Sawah pojok' })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(useFieldsStore.getState().fields).toHaveLength(1)
  })

  it('updates an existing lahan in edit mode', async () => {
    // Arrange
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    useFieldsStore.setState({ fields: [SAVED_FIELD] })
    vi.mocked(farmerProfileService.updateField).mockResolvedValue(
      envelope({ ...SAVED_FIELD, name: 'Sawah pojok barat' })
    )
    render(<FieldFormDialog open onOpenChange={onOpenChange} field={SAVED_FIELD} />)

    // Act
    const nameInput = screen.getByLabelText('Nama lahan')
    await user.clear(nameInput)
    await user.type(nameInput, 'Sawah pojok barat')
    await user.click(screen.getByRole('button', { name: /simpan lahan/i }))

    // Assert
    await waitFor(() => {
      expect(farmerProfileService.updateField).toHaveBeenCalledWith({
        fieldId: 'field-1',
        name: 'Sawah pojok barat',
      })
    })
    expect(useFieldsStore.getState().fields[0].name).toBe('Sawah pojok barat')
  })
})
