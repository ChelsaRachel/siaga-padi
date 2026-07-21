import { create } from 'zustand'

import {
  getQueueStatus,
  isSupported,
  retryQueue,
  subscribeToWorkerMessages,
} from '@/services/pwa.service'
import type { IPwaQueueStatus } from '@/types/pwa'

type TPwaLoadingStatus = 'idle' | 'loading' | 'ready' | 'error'

interface IPwaStore extends IPwaQueueStatus {
  isOnline: boolean
  isSupported: boolean
  loadingStatus: TPwaLoadingStatus
  initialize: () => () => void
  refreshQueueStatus: () => Promise<void>
  retryPendingDrafts: () => Promise<void>
}

const EMPTY_QUEUE_STATUS: IPwaQueueStatus = {
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
  errorMessage: null,
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Status draft offline tidak dapat diperbarui.'
}

export const usePwaStore = create<IPwaStore>((set, get) => ({
  ...EMPTY_QUEUE_STATUS,
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  isSupported: isSupported(),
  loadingStatus: 'idle',

  initialize: () => {
    const handleOnline = (): void => {
      set({ isOnline: true })
      void get().refreshQueueStatus()
    }
    const handleOffline = (): void => {
      set({ isOnline: false })
    }
    const handleControllerChange = (): void => {
      void get().refreshQueueStatus()
    }
    const unsubscribeWorkerMessages = subscribeToWorkerMessages((message) => {
      set({
        ...message.payload,
        loadingStatus: message.type === 'PWA_SYNC_FAILED' ? 'error' : 'ready',
      })
    })

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange)
    set({ isOnline: navigator.onLine, isSupported: isSupported() })
    void get().refreshQueueStatus()

    return () => {
      unsubscribeWorkerMessages()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange)
    }
  },

  refreshQueueStatus: async () => {
    if (!get().isSupported) {
      return
    }

    set({ loadingStatus: 'loading', errorMessage: null })
    try {
      const status = await getQueueStatus()
      set({ ...(status ?? EMPTY_QUEUE_STATUS), loadingStatus: 'ready' })
    } catch (error) {
      const activeRegistration = await navigator.serviceWorker.getRegistration().catch(() => null)
      if (!activeRegistration) {
        set({ loadingStatus: 'idle' })
        return
      }
      set({ loadingStatus: 'error', errorMessage: getErrorMessage(error) })
    }
  },

  retryPendingDrafts: async () => {
    if (!get().isOnline || get().isSyncing) {
      return
    }

    set({ isSyncing: true, loadingStatus: 'loading', errorMessage: null })
    try {
      const status = await retryQueue()
      set({ ...(status ?? EMPTY_QUEUE_STATUS), loadingStatus: 'ready' })
    } catch (error) {
      set({
        isSyncing: false,
        loadingStatus: 'error',
        errorMessage: getErrorMessage(error),
      })
    }
  },
}))

