import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api-client', () => ({
  default: {
    post: vi.fn(),
  },
}))

import apiClient from './api-client'
import { assistedService } from './assisted.service'

function createEnvelope<T>(data: T) {
  return {
    metaData: { status: true, executionTime: 3, responseCode: 200, message: 'Success' },
    data,
    additionalInfo: null,
    copyright: 'siaga-padi',
  }
}

describe('assistedService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('search posts the query to apps/assisted/search', async () => {
    // Arrange
    const results = [
      {
        profileId: 'p1',
        displayName: 'Pak Budi',
        areaKabupaten: 'Karawang',
        areaKecamatan: 'Rengasdengklok',
        accountStatus: 'didampingi',
      },
    ]
    vi.mocked(apiClient.post).mockResolvedValue(createEnvelope(results))

    // Act
    const response = await assistedService.search({ query: 'budi' })

    // Assert
    expect(apiClient.post).toHaveBeenCalledWith('apps/assisted/search', { query: 'budi' })
    expect(response.data).toHaveLength(1)
    expect(response.data[0].displayName).toBe('Pak Budi')
  })

  it('start posts an existing subject with its consent method', async () => {
    // Arrange
    vi.mocked(apiClient.post).mockResolvedValue(
      createEnvelope({
        sessionId: 's1',
        subjectProfileId: 'p1',
        subjectDisplayName: 'Pak Budi',
        actorUserId: 'u-penyuluh',
        consentMethod: 'lisan',
        startedAt: '2026-07-26T08:00:00Z',
      })
    )

    // Act
    const response = await assistedService.start({ subjectProfileId: 'p1', consentMethod: 'lisan' })

    // Assert
    expect(apiClient.post).toHaveBeenCalledWith('apps/assisted/start', {
      subjectProfileId: 'p1',
      consentMethod: 'lisan',
    })
    expect(response.data.sessionId).toBe('s1')
  })

  it('start posts a minimal newProfile without any national-ID field', async () => {
    // Arrange
    vi.mocked(apiClient.post).mockResolvedValue(
      createEnvelope({
        sessionId: 's2',
        subjectProfileId: 'p-new',
        subjectDisplayName: 'Bu Rina',
        actorUserId: 'u-penyuluh',
        consentMethod: 'tertulis',
        startedAt: '2026-07-26T09:00:00Z',
      })
    )

    // Act
    await assistedService.start({
      newProfile: { displayName: 'Bu Rina', areaKabupaten: 'Karawang', areaKecamatan: 'Kutawaluya' },
      consentMethod: 'tertulis',
    })

    // Assert — payload matches the contract exactly (no extra identity fields)
    const payload = vi.mocked(apiClient.post).mock.calls[0][1]
    expect(payload).toEqual({
      newProfile: { displayName: 'Bu Rina', areaKabupaten: 'Karawang', areaKecamatan: 'Kutawaluya' },
      consentMethod: 'tertulis',
    })
  })

  it('end posts the sessionId to apps/assisted/end', async () => {
    // Arrange
    vi.mocked(apiClient.post).mockResolvedValue(
      createEnvelope({ sessionId: 's1', endedAt: '2026-07-26T10:00:00Z' })
    )

    // Act
    const response = await assistedService.end({ sessionId: 's1' })

    // Assert
    expect(apiClient.post).toHaveBeenCalledWith('apps/assisted/end', { sessionId: 's1' })
    expect(response.data.endedAt).toBe('2026-07-26T10:00:00Z')
  })
})
