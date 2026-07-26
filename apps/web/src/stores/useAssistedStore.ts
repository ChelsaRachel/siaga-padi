import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConsentMethod } from '@/types/siaga-auth'

/**
 * Assisted-mode ("Dampingi Petani") session state.
 *
 * Later sprints (case wizard "atas nama") read the active subject + sessionId
 * through the exported selectors. Persisted so a page reload keeps the
 * persistent banner while the mode is active.
 *
 * API calls (start/end) live in `features/penyuluh/assisted` hooks +
 * `services/assisted.service.ts` — this store only holds state.
 */

export interface IAssistedSubject {
  profileId: string
  displayName: string
}

export interface IAssistedActiveSession {
  sessionId: string
  subject: IAssistedSubject
  consentMethod: ConsentMethod
  /** ISO 8601 — server-stamped start time. */
  startedAt: string
}

interface AssistedStore {
  sessionId: string | null
  subject: IAssistedSubject | null
  consentMethod: ConsentMethod | null
  startedAt: string | null
  setActiveSession: (session: IAssistedActiveSession) => void
  clearSession: () => void
}

/* Selectors — the contract later sprints consume. */
export const selectAssistedSessionId = (state: AssistedStore): string | null => state.sessionId
export const selectAssistedSubject = (state: AssistedStore): IAssistedSubject | null => state.subject
export const selectIsAssistedActive = (state: AssistedStore): boolean => state.sessionId !== null

export const useAssistedStore = create<AssistedStore>()(
  persist(
    (set) => ({
      sessionId: null,
      subject: null,
      consentMethod: null,
      startedAt: null,

      setActiveSession: ({ sessionId, subject, consentMethod, startedAt }) =>
        set({
          sessionId,
          subject,
          consentMethod,
          startedAt,
        }),

      clearSession: () =>
        set({
          sessionId: null,
          subject: null,
          consentMethod: null,
          startedAt: null,
        }),
    }),
    {
      name: 'assisted-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        subject: state.subject,
        consentMethod: state.consentMethod,
        startedAt: state.startedAt,
      }),
    }
  )
)
