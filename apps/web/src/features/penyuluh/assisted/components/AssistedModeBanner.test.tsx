import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/assisted.service', () => ({
  assistedService: {
    search: vi.fn(),
    start: vi.fn(),
    end: vi.fn(),
  },
}))

import { assistedService } from '@/services/assisted.service'
import { useAssistedStore } from '@/stores/useAssistedStore'
import { AssistedModeBanner } from './AssistedModeBanner'

const ACTIVE_SESSION = {
  sessionId: 'assist-1',
  subject: { profileId: 'profile-9', displayName: 'Pak Budi' },
  consentMethod: 'lisan' as const,
  startedAt: '2026-07-26T08:00:00Z',
}

describe('AssistedModeBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAssistedStore.getState().clearSession()
  })

  it('renders nothing when no assisted session is active', () => {
    // Act
    render(<AssistedModeBanner />)

    // Assert
    expect(screen.queryByTestId('assisted-mode-banner')).not.toBeInTheDocument()
  })

  it('shows "Anda bertindak atas nama" with the subject name while active', () => {
    // Arrange
    useAssistedStore.getState().setActiveSession(ACTIVE_SESSION)

    // Act
    render(<AssistedModeBanner />)

    // Assert
    const banner = screen.getByTestId('assisted-mode-banner')
    expect(banner).toHaveTextContent('Anda bertindak atas nama:')
    expect(banner).toHaveTextContent('Pak Budi')
  })

  it('ends the session via the API and hides itself on exit', async () => {
    // Arrange
    const user = userEvent.setup()
    useAssistedStore.getState().setActiveSession(ACTIVE_SESSION)
    vi.mocked(assistedService.end).mockResolvedValue({
      metaData: { status: true, executionTime: 2, responseCode: 200, message: 'Success' },
      data: { sessionId: 'assist-1', endedAt: '2026-07-26T10:00:00Z' },
      additionalInfo: null,
      copyright: 'siaga-padi',
    })
    render(<AssistedModeBanner />)

    // Act
    await user.click(screen.getByTestId('assisted-mode-exit'))

    // Assert
    await waitFor(() => {
      expect(assistedService.end).toHaveBeenCalledWith({ sessionId: 'assist-1' })
      expect(useAssistedStore.getState().sessionId).toBeNull()
      expect(screen.queryByTestId('assisted-mode-banner')).not.toBeInTheDocument()
    })
  })

  it('keeps the banner and shows an error message when ending fails', async () => {
    // Arrange
    const user = userEvent.setup()
    useAssistedStore.getState().setActiveSession(ACTIVE_SESSION)
    vi.mocked(assistedService.end).mockRejectedValue({
      status: 403,
      message: 'Sesi bukan milik Anda.',
      additionalInfo: null,
    })
    render(<AssistedModeBanner />)

    // Act
    await user.click(screen.getByTestId('assisted-mode-exit'))

    // Assert — session stays active, error surfaced
    await waitFor(() => {
      expect(screen.getByTestId('assisted-mode-banner')).toBeInTheDocument()
      expect(screen.getByText('Sesi bukan milik Anda.')).toBeInTheDocument()
    })
    expect(useAssistedStore.getState().sessionId).toBe('assist-1')
  })

  it('clears stale local state when the server says the session already ended (400)', async () => {
    // Arrange
    const user = userEvent.setup()
    useAssistedStore.getState().setActiveSession(ACTIVE_SESSION)
    vi.mocked(assistedService.end).mockRejectedValue({
      status: 400,
      message: 'Sesi sudah berakhir.',
      additionalInfo: null,
    })
    render(<AssistedModeBanner />)

    // Act
    await user.click(screen.getByTestId('assisted-mode-exit'))

    // Assert
    await waitFor(() => {
      expect(useAssistedStore.getState().sessionId).toBeNull()
      expect(screen.queryByTestId('assisted-mode-banner')).not.toBeInTheDocument()
    })
  })
})
