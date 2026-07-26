import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/models';
import type { SiagaProfile, SiagaRole, SiagaSession } from '@/types/siaga-auth';
import { useAssistedStore } from '@/stores/useAssistedStore';

export interface AuthCredentials {
  session: SiagaSession;
  profile: SiagaProfile;
}

interface AuthStore {
  /** Legacy shape kept for backward compatibility (UserDropdown, boilerplate code). */
  user: User | null;
  profile: SiagaProfile | null;
  session: SiagaSession | null;
  isAuthenticated: boolean;
  /**
   * True when a token refresh failed while the user was authenticated.
   * The shell shows a draft-preserving re-login modal instead of a hard
   * redirect; a successful re-login (setAuth) clears the flag.
   */
  isSessionExpired: boolean;
  isLoading: boolean;
  setAuth: (credentials: AuthCredentials) => void;
  setSession: (session: SiagaSession) => void;
  setProfile: (profile: SiagaProfile) => void;
  markSessionExpired: () => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hasRole: (role: SiagaRole) => boolean;
}

/** Map the Siaga profile onto the boilerplate User shape consumed by legacy components. */
function toLegacyUser(profile: SiagaProfile): User {
  return {
    id: profile.userId,
    username: profile.displayName,
    email: '',
    role: profile.role,
  };
}

/* Selectors — prefer these over inline lambdas in components. */
export const selectRole = (state: AuthStore): SiagaRole | null => state.profile?.role ?? null;
export const selectProfile = (state: AuthStore): SiagaProfile | null => state.profile;
export const selectIsAuthenticated = (state: AuthStore): boolean => state.isAuthenticated;

/**
 * Auth Store using Zustand.
 *
 * Persistence choice (documented per Sprint 01 task 01):
 * - Persisted: `profile`, `session` (access + refresh token), legacy `user`,
 *   `isAuthenticated`. Tokens live in the response body (no cookies), so the
 *   PWA must persist them to survive reloads/offline restarts.
 * - Persisted: `isSessionExpired` — a reload during an expired session must
 *   reopen the re-login dialog; otherwise the user lands in an
 *   authenticated-looking shell where every call 401s with no prompt.
 * - NOT persisted: `isLoading` — transient UI state.
 * - `clearAuth` resets only this store (localStorage `auth-storage`); it must
 *   NEVER touch offline draft storage (IndexedDB `siaga-padi-pwa`) — drafts
 *   survive logout and session expiry by design.
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      isAuthenticated: false,
      isSessionExpired: false,
      isLoading: false,

      setAuth: ({ session, profile }) =>
        set({
          user: toLegacyUser(profile),
          profile,
          session,
          isAuthenticated: true,
          isSessionExpired: false,
          isLoading: false,
        }),

      setSession: (session) =>
        set({
          session,
          isSessionExpired: false,
        }),

      setProfile: (profile) =>
        set({
          profile,
          user: toLegacyUser(profile),
        }),

      markSessionExpired: () =>
        set({
          session: null,
          isSessionExpired: true,
        }),

      clearAuth: () => {
        // Ending auth also ends any assisted "atas nama" UI state.
        // Offline drafts (IndexedDB) are intentionally left untouched.
        useAssistedStore.getState().clearSession();
        set({
          user: null,
          profile: null,
          session: null,
          isAuthenticated: false,
          isSessionExpired: false,
          isLoading: false,
        });
      },

      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),

      hasRole: (role) => get().profile?.role === role,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        isSessionExpired: state.isSessionExpired,
      }),
    }
  )
);
