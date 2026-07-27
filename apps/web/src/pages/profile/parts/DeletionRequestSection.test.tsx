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
import type { SiagaApiResponse } from '@/types/api'
import type { SiagaDeletionRequest } from '@/types/siaga-case'
import { DeletionRequestSection } from './DeletionRequestSection'

function envelope<T>(data: T): SiagaApiResponse<T> {
  return {
    metaData: { status: true, executionTime: 1, responseCode: 200, message: 'Success' },
    data,
    additionalInfo: null,
    copyright: 'siaga-padi',
  }
}

const RECORDED_REQUEST: SiagaDeletionRequest = {
  requestId: 'req-1',
  profileId: 'profile-1',
  reason: null,
  status: 'tercatat',
  requestedAt: '2026-07-26T02:00:00Z',
  processedAt: null,
}

describe('DeletionRequestSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the request button when no deletion request exists yet', async () => {
    // Arrange
    vi.mocked(farmerProfileService.getDeletionRequest).mockResolvedValue(envelope(null))

    // Act
    render(<DeletionRequestSection />)

    // Assert
    expect(await screen.findByTestId('deletion-request-button')).toBeInTheDocument()
    expect(screen.queryByTestId('deletion-request-status')).not.toBeInTheDocument()
  })

  it('submits via the honest confirmation dialog and then shows the "Tercatat" status', async () => {
    // Arrange
    const user = userEvent.setup()
    vi.mocked(farmerProfileService.getDeletionRequest).mockResolvedValue(envelope(null))
    vi.mocked(farmerProfileService.requestDeletion).mockResolvedValue(envelope(RECORDED_REQUEST))
    render(<DeletionRequestSection />)

    // Act — open dialog, add a reason, confirm
    await user.click(await screen.findByTestId('deletion-request-button'))
    expect(await screen.findByText('Ajukan penghapusan data?')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'sesuai kebijakan retensi data — bukan penghapusan seketika'
    )
    await user.type(screen.getByTestId('deletion-reason-input'), 'Pindah domisili')
    await user.click(screen.getByTestId('deletion-request-confirm'))

    // Assert
    await waitFor(() => {
      expect(farmerProfileService.requestDeletion).toHaveBeenCalledWith({ reason: 'Pindah domisili' })
    })
    expect(await screen.findByTestId('deletion-request-status')).toHaveTextContent('Tercatat')
    expect(screen.queryByTestId('deletion-request-button')).not.toBeInTheDocument()
  })

  it('shows the recorded status straight away when a request already exists', async () => {
    // Arrange
    vi.mocked(farmerProfileService.getDeletionRequest).mockResolvedValue(envelope(RECORDED_REQUEST))

    // Act
    render(<DeletionRequestSection />)

    // Assert
    expect(await screen.findByTestId('deletion-request-status')).toHaveTextContent('Tercatat')
    expect(screen.queryByTestId('deletion-request-button')).not.toBeInTheDocument()
  })

  it('surfaces an error and keeps the button when the submit fails', async () => {
    // Arrange
    const user = userEvent.setup()
    vi.mocked(farmerProfileService.getDeletionRequest).mockResolvedValue(envelope(null))
    vi.mocked(farmerProfileService.requestDeletion).mockRejectedValue({
      status: 500,
      message: 'Terjadi gangguan. Coba lagi.',
      additionalInfo: null,
    })
    render(<DeletionRequestSection />)

    // Act
    await user.click(await screen.findByTestId('deletion-request-button'))
    await user.click(screen.getByTestId('deletion-request-confirm'))

    // Assert
    expect(await screen.findByTestId('deletion-request-error')).toHaveTextContent(
      'Terjadi gangguan. Coba lagi.'
    )
    expect(screen.getByTestId('deletion-request-button')).toBeInTheDocument()
  })
})
