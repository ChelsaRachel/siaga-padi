import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SiagaProfile } from '@/types/siaga-auth'
import { ProfileCard } from './ProfileCard'

function makeProfile(overrides: Partial<SiagaProfile> = {}): SiagaProfile {
  return {
    profileId: 'profile-1',
    userId: 'user-1',
    displayName: 'Pak Budi',
    role: 'petani',
    areaKabupaten: 'Karawang',
    areaKecamatan: 'Rengasdengklok',
    accountStatus: 'mandiri',
    researchConsent: true,
    locationConsent: false,
    assignmentAreas: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('ProfileCard', () => {
  it('renders consent indicators from the profile flags (ikon + teks, not color-only)', () => {
    // Arrange
    const profile = makeProfile({ locationConsent: false, researchConsent: true })

    // Act
    render(<ProfileCard profile={profile} onEdit={vi.fn()} />)

    // Assert
    expect(screen.getByTestId('consent-location')).toHaveTextContent('Izin berbagi lokasi: Nonaktif')
    expect(screen.getByTestId('consent-research')).toHaveTextContent('Izin data untuk riset: Aktif')
  })

  it('flips indicator text when both consents are granted', () => {
    // Arrange
    const profile = makeProfile({ locationConsent: true, researchConsent: true })

    // Act
    render(<ProfileCard profile={profile} onEdit={vi.fn()} />)

    // Assert
    expect(screen.getByTestId('consent-location')).toHaveTextContent('Izin berbagi lokasi: Aktif')
    expect(screen.getByTestId('consent-research')).toHaveTextContent('Izin data untuk riset: Aktif')
  })

  it('shows nama panggilan, area domisili, and the mandiri/didampingi account label', () => {
    // Arrange
    const profile = makeProfile({ accountStatus: 'didampingi' })

    // Act
    render(<ProfileCard profile={profile} onEdit={vi.fn()} />)

    // Assert
    expect(screen.getByText('Pak Budi')).toBeInTheDocument()
    expect(screen.getByText(/Rengasdengklok, Karawang/)).toBeInTheDocument()
    expect(screen.getByTestId('account-status-badge')).toHaveTextContent('Akun Didampingi')
  })
})
