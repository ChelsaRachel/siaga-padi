import { beforeEach, describe, expect, it } from 'vitest'
import type { SiagaProfile, SiagaSession } from '@/types/siaga-auth'
import { PWA_IDEMPOTENCY_HEADER } from '@/config/pwa-config'
import {
  clearFailedDrafts,
  listFailedDrafts,
  saveFailedDraft,
} from '@/services/offline-draft-storage.service'
import { useAssistedStore } from './useAssistedStore'
import {
  selectIsAuthenticated,
  selectProfile,
  selectRole,
  useAuthStore,
} from './useAuthStore'

const SESSION: SiagaSession = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'bearer',
  expiresIn: 3600,
}

const PROFILE: SiagaProfile = {
  profileId: 'profile-1',
  userId: 'user-1',
  displayName: 'Bu Sari',
  role: 'penyuluh',
  areaKabupaten: 'Karawang',
  areaKecamatan: 'Rengasdengklok',
  accountStatus: 'mandiri',
  researchConsent: true,
  locationConsent: false,
  assignmentAreas: ['Rengasdengklok', 'Kutawaluya'],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
}

const INITIAL_STATE = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  isSessionExpired: false,
  isLoading: false,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState(INITIAL_STATE)
    useAssistedStore.getState().clearSession()
  })

  describe('setAuth', () => {
    it('populates session, profile, and auth flags on login success', () => {
      // Act
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })

      // Assert
      const state = useAuthStore.getState()
      expect(state.session).toEqual(SESSION)
      expect(state.profile).toEqual(PROFILE)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isSessionExpired).toBe(false)
      expect(state.isLoading).toBe(false)
    })

    it('maps the profile onto the legacy user shape for backward compatibility', () => {
      // Act
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })

      // Assert
      expect(useAuthStore.getState().user).toEqual({
        id: 'user-1',
        username: 'Bu Sari',
        email: '',
        role: 'penyuluh',
      })
    })

    it('clears a pending session-expired flag after re-login', () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      useAuthStore.getState().markSessionExpired()

      // Act
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })

      // Assert
      expect(useAuthStore.getState().isSessionExpired).toBe(false)
    })
  })

  describe('setSession', () => {
    it('updates tokens after a successful refresh without touching the profile', () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      const refreshedSession: SiagaSession = {
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        tokenType: 'bearer',
        expiresIn: 3600,
      }

      // Act
      useAuthStore.getState().setSession(refreshedSession)

      // Assert
      const state = useAuthStore.getState()
      expect(state.session).toEqual(refreshedSession)
      expect(state.profile).toEqual(PROFILE)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isSessionExpired).toBe(false)
    })
  })

  describe('markSessionExpired', () => {
    it('drops tokens but keeps profile and authenticated flag for the re-login modal', () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })

      // Act
      useAuthStore.getState().markSessionExpired()

      // Assert
      const state = useAuthStore.getState()
      expect(state.session).toBeNull()
      expect(state.isSessionExpired).toBe(true)
      expect(state.isAuthenticated).toBe(true)
      expect(state.profile).toEqual(PROFILE)
    })
  })

  describe('hasRole', () => {
    it('matches only the active profile role', () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })

      // Act + Assert
      expect(useAuthStore.getState().hasRole('penyuluh')).toBe(true)
      expect(useAuthStore.getState().hasRole('admin')).toBe(false)
    })

    it('returns false when logged out', () => {
      expect(useAuthStore.getState().hasRole('petani')).toBe(false)
    })
  })

  describe('setProfile', () => {
    it('replaces the profile and keeps the legacy user mapping in sync', () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      const updatedProfile = { ...PROFILE, displayName: 'Bu Sari Wijaya' }

      // Act
      useAuthStore.getState().setProfile(updatedProfile)

      // Assert
      expect(useAuthStore.getState().profile?.displayName).toBe('Bu Sari Wijaya')
      expect(useAuthStore.getState().user?.username).toBe('Bu Sari Wijaya')
    })
  })

  describe('setLoading', () => {
    it('toggles the loading flag', () => {
      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().isLoading).toBe(true)

      useAuthStore.getState().setLoading(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('selectors', () => {
    it('expose role, profile, and auth flag for components and guards', () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      const state = useAuthStore.getState()

      // Act + Assert
      expect(selectRole(state)).toBe('penyuluh')
      expect(selectProfile(state)).toEqual(PROFILE)
      expect(selectIsAuthenticated(state)).toBe(true)
    })

    it('return null role when no profile is present', () => {
      expect(selectRole(useAuthStore.getState())).toBeNull()
    })
  })

  describe('clearAuth', () => {
    it('resets auth state and ends any assisted session', () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      useAssistedStore.getState().setActiveSession({
        sessionId: 'assist-1',
        subject: { profileId: 'p-9', displayName: 'Pak Budi' },
        consentMethod: 'lisan',
        startedAt: '2026-07-26T08:00:00Z',
      })

      // Act
      useAuthStore.getState().clearAuth()

      // Assert
      const state = useAuthStore.getState()
      expect(state.session).toBeNull()
      expect(state.profile).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(useAssistedStore.getState().sessionId).toBeNull()
    })

    it('preserves offline drafts stored in IndexedDB', async () => {
      // Arrange — a queued draft exists before the session ends
      await clearFailedDrafts()
      const draftRequest = new Request('https://example.test/api/v1/apps/cases', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'draft-1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'draf kasus' }),
      })
      await saveFailedDraft(draftRequest, {
        status: 'failed',
        attempts: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
        lastError: 'offline',
      })
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })

      // Act
      useAuthStore.getState().clearAuth()

      // Assert — logout must never wipe local drafts
      const drafts = await listFailedDrafts()
      expect(drafts).toHaveLength(1)
      expect(drafts[0].id).toBe('draft-1')
    })
  })
})
