import { PWA_SERVICE_WORKER_URL } from '@/config/pwa-config'
import type {
  IPwaQueueStatus,
  IPwaRegistrationConfig,
  IPwaWorkerResponse,
  TPwaWorkerMessage,
  TPwaWorkerRequest,
} from '@/types/pwa'

const MESSAGE_TIMEOUT_MILLISECONDS = 5000

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Layanan offline tidak dapat digunakan.')
}

function isLocalhost(): boolean {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(window.location.hostname)
  )
}

async function registerValidServiceWorker(
  config?: IPwaRegistrationConfig,
): Promise<ServiceWorkerRegistration> {
  try {
    const registration = await navigator.serviceWorker.register(PWA_SERVICE_WORKER_URL)

    registration.onupdatefound = () => {
      const installingWorker = registration.installing
      if (!installingWorker) {
        return
      }

      installingWorker.onstatechange = () => {
        if (installingWorker.state !== 'installed') {
          return
        }

        if (navigator.serviceWorker.controller) {
          config?.onUpdate?.(registration)
        } else {
          config?.onSuccess?.(registration)
        }
      }
    }

    config?.onRegistered?.(registration)
    return registration
  } catch (error) {
    const normalizedError = normalizeError(error)
    config?.onError?.(normalizedError)
    throw normalizedError
  }
}

async function validateLocalServiceWorker(
  config?: IPwaRegistrationConfig,
): Promise<ServiceWorkerRegistration | null> {
  try {
    const response = await fetch(PWA_SERVICE_WORKER_URL, {
      headers: { 'Service-Worker': 'script' },
    })
    const contentType = response.headers.get('content-type')
    const isMissing =
      response.status === 404 ||
      (contentType !== null && !contentType.includes('javascript'))

    if (isMissing) {
      const registration = await navigator.serviceWorker.ready
      await registration.unregister()
      return null
    }

    return registerValidServiceWorker(config)
  } catch (error) {
    if (!navigator.onLine) {
      return null
    }
    const normalizedError = normalizeError(error)
    config?.onError?.(normalizedError)
    throw normalizedError
  }
}

async function getActiveWorker(): Promise<ServiceWorker | null> {
  if (!isSupported()) {
    return null
  }

  const registration = await navigator.serviceWorker.getRegistration()
  return navigator.serviceWorker.controller ?? registration?.active ?? null
}

async function sendWorkerMessage(message: TPwaWorkerRequest): Promise<IPwaWorkerResponse> {
  const worker = await getActiveWorker()
  if (!worker) {
    throw new Error('Service worker belum aktif. Muat ulang aplikasi setelah instalasi selesai.')
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => {
      channel.port1.close()
      reject(new Error('Respons layanan offline terlalu lama.'))
    }, MESSAGE_TIMEOUT_MILLISECONDS)

    channel.port1.onmessage = (event: MessageEvent<IPwaWorkerResponse>) => {
      window.clearTimeout(timeout)
      channel.port1.close()
      if (event.data.ok) {
        resolve(event.data)
      } else {
        reject(new Error(event.data.errorMessage ?? 'Layanan offline gagal memproses permintaan.'))
      }
    }

    worker.postMessage(message, [channel.port2])
  })
}

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
}

export function registerServiceWorker(config?: IPwaRegistrationConfig): () => void {
  if (process.env.NODE_ENV !== 'production' || !isSupported()) {
    return () => undefined
  }

  const handleLoad = (): void => {
    const registration = isLocalhost()
      ? validateLocalServiceWorker(config)
      : registerValidServiceWorker(config)

    void registration.catch(() => undefined)
  }

  window.addEventListener('load', handleLoad, { once: true })
  return () => window.removeEventListener('load', handleLoad)
}

export async function getQueueStatus(): Promise<IPwaQueueStatus | null> {
  try {
    const response = await sendWorkerMessage({ type: 'PWA_GET_QUEUE_STATUS' })
    return response.status ?? null
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function retryQueue(): Promise<IPwaQueueStatus | null> {
  try {
    const response = await sendWorkerMessage({ type: 'PWA_RETRY_QUEUE' })
    return response.status ?? null
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function clearLocalDrafts(): Promise<void> {
  try {
    await sendWorkerMessage({ type: 'PWA_CLEAR_LOCAL_DRAFTS' })
  } catch (error) {
    throw normalizeError(error)
  }
}

export function subscribeToWorkerMessages(
  listener: (message: TPwaWorkerMessage) => void,
): () => void {
  if (!isSupported()) {
    return () => undefined
  }

  const handleMessage = (event: MessageEvent<TPwaWorkerMessage>): void => {
    if (event.data?.type?.startsWith('PWA_')) {
      listener(event.data)
    }
  }

  navigator.serviceWorker.addEventListener('message', handleMessage)
  return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
}

