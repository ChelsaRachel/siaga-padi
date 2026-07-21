import { afterEach, describe, expect, it, vi } from 'vitest'

import { PWA_SERVICE_WORKER_URL } from '@/config/pwa-config'
import {
  clearLocalDrafts,
  getQueueStatus,
  isSupported,
  registerServiceWorker,
  retryQueue,
  subscribeToWorkerMessages,
} from './pwa.service'

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
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

const originalNodeEnv = process.env.NODE_ENV

describe('pwa.service', () => {
  afterEach(() => {
    removeServiceWorkerContainer()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('isSupported', () => {
    it('returns true when the browser exposes navigator.serviceWorker', () => {
      defineServiceWorkerContainer({})
      expect(isSupported()).toBe(true)
    })

    it('returns false when navigator.serviceWorker is absent', () => {
      removeServiceWorkerContainer()
      expect(isSupported()).toBe(false)
    })
  })

  describe('registerServiceWorker', () => {
    it('does nothing outside production', () => {
      process.env.NODE_ENV = 'test'
      defineServiceWorkerContainer({ register: vi.fn() })
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const cleanup = registerServiceWorker()

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('load', expect.anything(), expect.anything())
      expect(() => cleanup()).not.toThrow()
    })

    it('does nothing when the browser does not support service workers', () => {
      process.env.NODE_ENV = 'production'
      removeServiceWorkerContainer()
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      registerServiceWorker()

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('load', expect.anything(), expect.anything())
    })

    it('registers the worker on load when the script is served correctly', async () => {
      process.env.NODE_ENV = 'production'
      const register = vi.fn().mockResolvedValue({ onupdatefound: null })
      defineServiceWorkerContainer({ register })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          status: 200,
          headers: { get: () => 'text/javascript' },
        }),
      )
      const onRegistered = vi.fn()

      registerServiceWorker({ onRegistered })
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      expect(fetch).toHaveBeenCalledWith(PWA_SERVICE_WORKER_URL, {
        headers: { 'Service-Worker': 'script' },
      })
      expect(register).toHaveBeenCalledWith(PWA_SERVICE_WORKER_URL)
      expect(onRegistered).toHaveBeenCalled()
    })

    it('reports a normalized error when navigator.serviceWorker.register itself rejects', async () => {
      process.env.NODE_ENV = 'production'
      const register = vi.fn().mockRejectedValue(new Error('register gagal'))
      defineServiceWorkerContainer({ register })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          status: 200,
          headers: { get: () => 'text/javascript' },
        }),
      )
      const onError = vi.fn()

      registerServiceWorker({ onError })
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'register gagal' }))
    })

    it('ignores onstatechange while the worker has not finished installing', async () => {
      process.env.NODE_ENV = 'production'
      const registration = { installing: null as unknown, onupdatefound: null as unknown }
      const register = vi.fn().mockResolvedValue(registration)
      defineServiceWorkerContainer({ register, controller: null })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ status: 200, headers: { get: () => 'text/javascript' } }),
      )
      const onSuccess = vi.fn()

      registerServiceWorker({ onSuccess })
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      const installingWorker = { state: 'installing', onstatechange: null as (() => void) | null }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(registration as any).installing = installingWorker
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(registration as any).onupdatefound()
      installingWorker.onstatechange?.()

      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('calls onUpdate when an installed worker takes over from an existing controller', async () => {
      process.env.NODE_ENV = 'production'
      const registration = { installing: null as unknown, onupdatefound: null as unknown }
      const register = vi.fn().mockResolvedValue(registration)
      defineServiceWorkerContainer({ register, controller: {} })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ status: 200, headers: { get: () => 'text/javascript' } }),
      )
      const onUpdate = vi.fn()
      const onSuccess = vi.fn()

      registerServiceWorker({ onUpdate, onSuccess })
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      const installingWorker = { state: 'installing', onstatechange: null as (() => void) | null }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(registration as any).installing = installingWorker
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(registration as any).onupdatefound()
      installingWorker.state = 'installed'
      installingWorker.onstatechange?.()

      expect(onUpdate).toHaveBeenCalledWith(registration)
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('calls onSuccess when a fresh worker installs with no existing controller', async () => {
      process.env.NODE_ENV = 'production'
      const registration = { installing: null as unknown, onupdatefound: null as unknown }
      const register = vi.fn().mockResolvedValue(registration)
      defineServiceWorkerContainer({ register, controller: null })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ status: 200, headers: { get: () => 'text/javascript' } }),
      )
      const onSuccess = vi.fn()

      registerServiceWorker({ onSuccess })
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      const installingWorker = { state: 'installing', onstatechange: null as (() => void) | null }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(registration as any).installing = installingWorker
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(registration as any).onupdatefound()
      installingWorker.state = 'installed'
      installingWorker.onstatechange?.()

      expect(onSuccess).toHaveBeenCalledWith(registration)
    })

    it('ignores onupdatefound when there is no installing worker', async () => {
      process.env.NODE_ENV = 'production'
      const registration = { installing: null as unknown, onupdatefound: null as unknown }
      const register = vi.fn().mockResolvedValue(registration)
      defineServiceWorkerContainer({ register, controller: null })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ status: 200, headers: { get: () => 'text/javascript' } }),
      )

      registerServiceWorker()
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(registration as any).onupdatefound()
      }).not.toThrow()
    })

    it('unregisters the worker when the script is missing (404)', async () => {
      process.env.NODE_ENV = 'production'
      const register = vi.fn()
      const unregister = vi.fn().mockResolvedValue(undefined)
      defineServiceWorkerContainer({
        register,
        ready: Promise.resolve({ unregister }),
      })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          status: 404,
          headers: { get: () => null },
        }),
      )

      registerServiceWorker()
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      expect(unregister).toHaveBeenCalled()
      expect(register).not.toHaveBeenCalled()
    })

    it('quietly gives up when offline and the script fetch fails', async () => {
      process.env.NODE_ENV = 'production'
      defineServiceWorkerContainer({ register: vi.fn() })
      Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
      const onError = vi.fn()

      registerServiceWorker({ onError })
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      expect(onError).not.toHaveBeenCalled()
    })

    it('reports a normalized error when online and the script fetch fails', async () => {
      process.env.NODE_ENV = 'production'
      defineServiceWorkerContainer({ register: vi.fn() })
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
      const onError = vi.fn()

      registerServiceWorker({ onError })
      window.dispatchEvent(new Event('load'))
      await flushPromises()

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }))
    })
  })

  describe('worker messaging (getQueueStatus / retryQueue / clearLocalDrafts)', () => {
    const fakeStatus = {
      pendingCount: 1,
      failedCount: 0,
      conflictCount: 0,
      isSyncing: false,
      lastSyncedAt: null,
      errorMessage: null,
    }

    it('resolves with the status the worker replies with', async () => {
      const postMessage = vi.fn((_message, ports: MessagePort[]) => {
        ports[0].postMessage({ ok: true, status: fakeStatus })
      })
      defineServiceWorkerContainer({
        controller: { postMessage },
        getRegistration: vi.fn().mockResolvedValue(undefined),
      })

      const result = await getQueueStatus()

      expect(result).toEqual(fakeStatus)
      expect(postMessage.mock.calls[0][0]).toEqual({ type: 'PWA_GET_QUEUE_STATUS' })
    })

    it('rejects with the worker error message when the worker reports failure', async () => {
      const postMessage = vi.fn((_message, ports: MessagePort[]) => {
        ports[0].postMessage({ ok: false, errorMessage: 'gagal sync' })
      })
      defineServiceWorkerContainer({
        controller: { postMessage },
        getRegistration: vi.fn().mockResolvedValue(undefined),
      })

      await expect(getQueueStatus()).rejects.toThrow('gagal sync')
    })

    it('rejects when no active worker can be found', async () => {
      defineServiceWorkerContainer({
        controller: null,
        getRegistration: vi.fn().mockResolvedValue(undefined),
      })

      await expect(getQueueStatus()).rejects.toThrow(/belum aktif/)
    })

    it('rejects immediately when the browser has no service worker support at all', async () => {
      removeServiceWorkerContainer()

      await expect(getQueueStatus()).rejects.toThrow(/belum aktif/)
    })

    it('sends a retry message for retryQueue', async () => {
      const postMessage = vi.fn((_message, ports: MessagePort[]) => {
        ports[0].postMessage({ ok: true, status: fakeStatus })
      })
      defineServiceWorkerContainer({
        controller: { postMessage },
        getRegistration: vi.fn().mockResolvedValue(undefined),
      })

      await retryQueue()

      expect(postMessage.mock.calls[0][0]).toEqual({ type: 'PWA_RETRY_QUEUE' })
    })

    it('normalizes a retryQueue failure reported by the worker', async () => {
      const postMessage = vi.fn((_message, ports: MessagePort[]) => {
        ports[0].postMessage({ ok: false, errorMessage: 'gagal retry' })
      })
      defineServiceWorkerContainer({
        controller: { postMessage },
        getRegistration: vi.fn().mockResolvedValue(undefined),
      })

      await expect(retryQueue()).rejects.toThrow('gagal retry')
    })

    it('normalizes a clearLocalDrafts failure reported by the worker', async () => {
      const postMessage = vi.fn((_message, ports: MessagePort[]) => {
        ports[0].postMessage({ ok: false, errorMessage: 'gagal clear' })
      })
      defineServiceWorkerContainer({
        controller: { postMessage },
        getRegistration: vi.fn().mockResolvedValue(undefined),
      })

      await expect(clearLocalDrafts()).rejects.toThrow('gagal clear')
    })

    it('sends a clear message for clearLocalDrafts', async () => {
      const postMessage = vi.fn((_message, ports: MessagePort[]) => {
        ports[0].postMessage({ ok: true })
      })
      defineServiceWorkerContainer({
        controller: { postMessage },
        getRegistration: vi.fn().mockResolvedValue(undefined),
      })

      await clearLocalDrafts()

      expect(postMessage.mock.calls[0][0]).toEqual({ type: 'PWA_CLEAR_LOCAL_DRAFTS' })
    })

    it('rejects after the worker fails to reply within the timeout window', async () => {
      vi.useFakeTimers()
      const postMessage = vi.fn()
      defineServiceWorkerContainer({
        controller: { postMessage },
        getRegistration: vi.fn().mockResolvedValue(undefined),
      })

      const pending = getQueueStatus()
      const assertion = expect(pending).rejects.toThrow(/terlalu lama/)
      await vi.advanceTimersByTimeAsync(5000)
      await assertion
    })
  })

  describe('subscribeToWorkerMessages', () => {
    it('returns a no-op unsubscribe when unsupported', () => {
      removeServiceWorkerContainer()
      const listener = vi.fn()

      const unsubscribe = subscribeToWorkerMessages(listener)

      expect(() => unsubscribe()).not.toThrow()
      expect(listener).not.toHaveBeenCalled()
    })

    it('forwards only PWA_ prefixed worker messages to the listener', () => {
      const addEventListener = vi.fn()
      const removeEventListener = vi.fn()
      defineServiceWorkerContainer({ addEventListener, removeEventListener })
      const listener = vi.fn()

      const unsubscribe = subscribeToWorkerMessages(listener)
      const handler = addEventListener.mock.calls[0][1] as (event: MessageEvent) => void

      handler({ data: { type: 'PWA_SYNC_COMPLETED', payload: {} } } as MessageEvent)
      handler({ data: { type: 'SOME_OTHER_EVENT' } } as MessageEvent)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({ type: 'PWA_SYNC_COMPLETED', payload: {} })

      unsubscribe()
      expect(removeEventListener).toHaveBeenCalledWith('message', handler)
    })
  })
})
