import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/pwa.service', () => ({
  getQueueStatus: vi.fn(),
  isSupported: vi.fn().mockReturnValue(true),
  retryQueue: vi.fn(),
  subscribeToWorkerMessages: vi.fn().mockReturnValue(() => undefined),
}))

import * as pwaService from '@/services/pwa.service'
import { usePwaStore } from './usePwaStore'

const IDLE_STATE = {
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
  errorMessage: null,
  isOnline: true,
  isSupported: true,
  loadingStatus: 'idle' as const,
}

function defineServiceWorkerContainer(container: unknown): void {
  Object.defineProperty(window.navigator, 'serviceWorker', {
    value: container,
    configurable: true,
    writable: true,
  })
}

function removeServiceWorkerContainer(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window.navigator as any).serviceWorker
}

describe('usePwaStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePwaStore.setState(IDLE_STATE, false)
  })

  afterEach(() => {
    removeServiceWorkerContainer()
  })

  describe('refreshQueueStatus', () => {
    it('does nothing when the platform is not supported', async () => {
      usePwaStore.setState({ isSupported: false })

      await usePwaStore.getState().refreshQueueStatus()

      expect(pwaService.getQueueStatus).not.toHaveBeenCalled()
      expect(usePwaStore.getState().loadingStatus).toBe('idle')
    })

    it('merges the returned status and marks loading as ready on success', async () => {
      vi.mocked(pwaService.getQueueStatus).mockResolvedValue({
        pendingCount: 3,
        failedCount: 1,
        conflictCount: 0,
        isSyncing: false,
        lastSyncedAt: 1_700_000_000_000,
        errorMessage: null,
      })

      await usePwaStore.getState().refreshQueueStatus()

      const state = usePwaStore.getState()
      expect(state.pendingCount).toBe(3)
      expect(state.failedCount).toBe(1)
      expect(state.lastSyncedAt).toBe(1_700_000_000_000)
      expect(state.loadingStatus).toBe('ready')
    })

    it('falls back to the empty queue status when the service resolves nothing', async () => {
      vi.mocked(pwaService.getQueueStatus).mockResolvedValue(null)

      await usePwaStore.getState().refreshQueueStatus()

      const state = usePwaStore.getState()
      expect(state.pendingCount).toBe(0)
      expect(state.loadingStatus).toBe('ready')
    })

    it('uses a generic message when the rejection is not an Error instance', async () => {
      defineServiceWorkerContainer({ getRegistration: vi.fn().mockResolvedValue({}) })
      vi.mocked(pwaService.getQueueStatus).mockRejectedValue('not-an-error')

      await usePwaStore.getState().refreshQueueStatus()

      expect(usePwaStore.getState().errorMessage).toBe('Status draft offline tidak dapat diperbarui.')
    })

    it('sets an error state when the worker registration is active but the call fails', async () => {
      defineServiceWorkerContainer({ getRegistration: vi.fn().mockResolvedValue({}) })
      vi.mocked(pwaService.getQueueStatus).mockRejectedValue(new Error('gagal ambil status'))

      await usePwaStore.getState().refreshQueueStatus()

      const state = usePwaStore.getState()
      expect(state.loadingStatus).toBe('error')
      expect(state.errorMessage).toBe('gagal ambil status')
    })

    it('quietly falls back to idle when there is no active worker registration', async () => {
      defineServiceWorkerContainer({ getRegistration: vi.fn().mockResolvedValue(undefined) })
      vi.mocked(pwaService.getQueueStatus).mockRejectedValue(new Error('gagal ambil status'))

      await usePwaStore.getState().refreshQueueStatus()

      expect(usePwaStore.getState().loadingStatus).toBe('idle')
    })
  })

  describe('retryPendingDrafts', () => {
    it('does nothing while offline', async () => {
      usePwaStore.setState({ isOnline: false })

      await usePwaStore.getState().retryPendingDrafts()

      expect(pwaService.retryQueue).not.toHaveBeenCalled()
    })

    it('does nothing while already syncing', async () => {
      usePwaStore.setState({ isOnline: true, isSyncing: true })

      await usePwaStore.getState().retryPendingDrafts()

      expect(pwaService.retryQueue).not.toHaveBeenCalled()
    })

    it('merges the returned status and marks loading as ready on success', async () => {
      vi.mocked(pwaService.retryQueue).mockResolvedValue({
        pendingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        isSyncing: false,
        lastSyncedAt: 1_700_000_001_000,
        errorMessage: null,
      })

      await usePwaStore.getState().retryPendingDrafts()

      const state = usePwaStore.getState()
      expect(state.loadingStatus).toBe('ready')
      expect(state.lastSyncedAt).toBe(1_700_000_001_000)
    })

    it('falls back to the empty queue status when the service resolves nothing', async () => {
      vi.mocked(pwaService.retryQueue).mockResolvedValue(null)

      await usePwaStore.getState().retryPendingDrafts()

      const state = usePwaStore.getState()
      expect(state.pendingCount).toBe(0)
      expect(state.loadingStatus).toBe('ready')
    })

    it('sets an error state and stops syncing when the retry fails', async () => {
      vi.mocked(pwaService.retryQueue).mockRejectedValue(new Error('gagal retry'))

      await usePwaStore.getState().retryPendingDrafts()

      const state = usePwaStore.getState()
      expect(state.isSyncing).toBe(false)
      expect(state.loadingStatus).toBe('error')
      expect(state.errorMessage).toBe('gagal retry')
    })
  })

  describe('initialize', () => {
    it('wires online/offline listeners and refreshes status once immediately', () => {
      vi.mocked(pwaService.getQueueStatus).mockResolvedValue({
        pendingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        isSyncing: false,
        lastSyncedAt: null,
        errorMessage: null,
      })

      const cleanup = usePwaStore.getState().initialize()

      expect(pwaService.getQueueStatus).toHaveBeenCalledTimes(1)
      cleanup()
    })

    it('marks online and refreshes status when the browser comes back online', async () => {
      vi.mocked(pwaService.getQueueStatus).mockResolvedValue({
        pendingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        isSyncing: false,
        lastSyncedAt: null,
        errorMessage: null,
      })
      usePwaStore.setState({ isOnline: false })

      const cleanup = usePwaStore.getState().initialize()
      vi.mocked(pwaService.getQueueStatus).mockClear()
      window.dispatchEvent(new Event('online'))
      await Promise.resolve()

      expect(usePwaStore.getState().isOnline).toBe(true)
      expect(pwaService.getQueueStatus).toHaveBeenCalledTimes(1)
      cleanup()
    })

    it('marks offline when the browser loses connectivity', () => {
      const cleanup = usePwaStore.getState().initialize()

      window.dispatchEvent(new Event('offline'))

      expect(usePwaStore.getState().isOnline).toBe(false)
      cleanup()
    })

    it('refreshes queue status when the active worker controller changes', async () => {
      const addEventListener = vi.fn()
      const removeEventListener = vi.fn()
      defineServiceWorkerContainer({ addEventListener, removeEventListener })
      vi.mocked(pwaService.getQueueStatus).mockResolvedValue({
        pendingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        isSyncing: false,
        lastSyncedAt: null,
        errorMessage: null,
      })

      const cleanup = usePwaStore.getState().initialize()
      vi.mocked(pwaService.getQueueStatus).mockClear()
      const handler = addEventListener.mock.calls.find(
        (call) => call[0] === 'controllerchange',
      )?.[1] as () => void
      handler()
      await Promise.resolve()

      expect(pwaService.getQueueStatus).toHaveBeenCalledTimes(1)

      cleanup()
      expect(removeEventListener).toHaveBeenCalledWith('controllerchange', handler)
    })

    it('applies worker-pushed status updates via subscribeToWorkerMessages', () => {
      const cleanup = usePwaStore.getState().initialize()
      const listener = vi.mocked(pwaService.subscribeToWorkerMessages).mock.calls[0][0]

      listener({
        type: 'PWA_SYNC_FAILED',
        payload: {
          pendingCount: 2,
          failedCount: 2,
          conflictCount: 0,
          isSyncing: false,
          lastSyncedAt: null,
          errorMessage: 'gagal sinkron',
        },
      })

      const state = usePwaStore.getState()
      expect(state.loadingStatus).toBe('error')
      expect(state.failedCount).toBe(2)
      cleanup()
    })

    it('marks loading as ready for non-failure worker-pushed messages', () => {
      const cleanup = usePwaStore.getState().initialize()
      const listener = vi.mocked(pwaService.subscribeToWorkerMessages).mock.calls[0][0]

      listener({
        type: 'PWA_SYNC_COMPLETED',
        payload: {
          pendingCount: 0,
          failedCount: 0,
          conflictCount: 0,
          isSyncing: false,
          lastSyncedAt: 1_700_000_002_000,
          errorMessage: null,
        },
      })

      expect(usePwaStore.getState().loadingStatus).toBe('ready')
      cleanup()
    })
  })
})
