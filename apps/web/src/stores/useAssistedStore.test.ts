import { beforeEach, describe, expect, it } from 'vitest'
import {
  selectAssistedSessionId,
  selectAssistedSubject,
  selectIsAssistedActive,
  useAssistedStore,
} from './useAssistedStore'

const ACTIVE_SESSION = {
  sessionId: 'assist-1',
  subject: { profileId: 'profile-9', displayName: 'Pak Budi' },
  consentMethod: 'lisan' as const,
  startedAt: '2026-07-26T08:00:00Z',
}

describe('useAssistedStore', () => {
  beforeEach(() => {
    useAssistedStore.getState().clearSession()
  })

  it('starts with no active session', () => {
    const state = useAssistedStore.getState()
    expect(state.sessionId).toBeNull()
    expect(state.subject).toBeNull()
    expect(state.consentMethod).toBeNull()
    expect(state.startedAt).toBeNull()
  })

  it('setActiveSession stores sessionId, subject, consent method, and start time', () => {
    // Act
    useAssistedStore.getState().setActiveSession(ACTIVE_SESSION)

    // Assert
    const state = useAssistedStore.getState()
    expect(state.sessionId).toBe('assist-1')
    expect(state.subject).toEqual({ profileId: 'profile-9', displayName: 'Pak Budi' })
    expect(state.consentMethod).toBe('lisan')
    expect(state.startedAt).toBe('2026-07-26T08:00:00Z')
  })

  it('clearSession resets the whole assisted state', () => {
    // Arrange
    useAssistedStore.getState().setActiveSession(ACTIVE_SESSION)

    // Act
    useAssistedStore.getState().clearSession()

    // Assert
    const state = useAssistedStore.getState()
    expect(state.sessionId).toBeNull()
    expect(state.subject).toBeNull()
    expect(state.consentMethod).toBeNull()
    expect(state.startedAt).toBeNull()
  })

  it('exposes subject + sessionId through the selectors later sprints consume', () => {
    // Arrange
    useAssistedStore.getState().setActiveSession(ACTIVE_SESSION)

    // Act
    const state = useAssistedStore.getState()

    // Assert
    expect(selectAssistedSessionId(state)).toBe('assist-1')
    expect(selectAssistedSubject(state)).toEqual({ profileId: 'profile-9', displayName: 'Pak Budi' })
    expect(selectIsAssistedActive(state)).toBe(true)
  })
})
