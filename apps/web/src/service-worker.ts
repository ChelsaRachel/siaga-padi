/// <reference lib="webworker" />

import { Queue } from 'workbox-background-sync'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

import {
  PWA_DRAFT_QUEUE_HEADER,
  PWA_DRAFT_QUEUE_HEADER_VALUE,
  PWA_DRAFT_QUEUE_NAME,
  PWA_IDEMPOTENCY_HEADER,
  PWA_MAX_RETRY_ATTEMPTS,
  PWA_QUEUE_RETENTION_MINUTES,
} from '@/config/pwa-config'
import {
  clearFailedDrafts,
  deleteFailedDraft,
  listFailedDrafts,
  readSyncMeta,
  restoreFailedDraftRequest,
  saveFailedDraft,
  writeSyncMeta,
} from '@/services/offline-draft-storage.service'
import type {
  IPwaAuthTokenReply,
  IPwaQueueStatus,
  IPwaWorkerResponse,
  TPwaWorkerRequest,
} from '@/types/pwa'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision: string | null; url: string }>
}

interface IQueueMetadata {
  attempts: number
  createdAt: number
}

const RETENTION_MILLISECONDS = PWA_QUEUE_RETENTION_MINUTES * 60 * 1000
const RETRYABLE_STATUS_CODES = new Set([429])
/**
 * Auth failures on replay are NOT the draft's fault — the token captured at
 * submit time simply expired. They must never archive the draft as permanently
 * failed; the entry goes back to the queue and waits for a fresh token.
 */
const AUTH_STATUS_CODES = new Set([401, 403])
const AUTH_TOKEN_TIMEOUT_MILLISECONDS = 3000
const AUTH_UNAVAILABLE_MESSAGE =
  'Menunggu sesi aktif untuk mengirim draft. Buka aplikasi dan masuk kembali.'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Sinkronisasi draft gagal.'
}

function createIdempotencyKey(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function parseQueueMetadata(metadata?: object): IQueueMetadata {
  const value = metadata as Partial<IQueueMetadata> | undefined
  return {
    attempts: typeof value?.attempts === 'number' ? value.attempts : 0,
    createdAt: typeof value?.createdAt === 'number' ? value.createdAt : Date.now(),
  }
}

function isRetryableResponse(response: Response): boolean {
  return RETRYABLE_STATUS_CODES.has(response.status) || response.status >= 500
}

function isDraftMutationRequest(request: Request, url: URL): boolean {
  return (
    url.origin === self.location.origin &&
    request.headers.get(PWA_DRAFT_QUEUE_HEADER) === PWA_DRAFT_QUEUE_HEADER_VALUE
  )
}

function ensureIdempotencyKey(request: Request): { request: Request; idempotencyKey: string } {
  const headers = new Headers(request.headers)
  const idempotencyKey = headers.get(PWA_IDEMPOTENCY_HEADER) ?? createIdempotencyKey()
  headers.set(PWA_IDEMPOTENCY_HEADER, idempotencyKey)

  return {
    request: new Request(request, { headers }),
    idempotencyKey,
  }
}

/**
 * Drop the bearer token before the request is persisted. Queued drafts can sit
 * in IndexedDB for up to the retention window, and a token at rest there is
 * both a disclosure risk and useless (it expires long before replay).
 * `attachFreshAuthorization` re-adds a live token at replay time.
 */
function stripAuthorization(request: Request): Request {
  const headers = new Headers(request.headers)
  headers.delete('authorization')
  return new Request(request, { headers })
}

/** Ask any open page for the current access token (null when none can answer). */
async function requestAuthTokenFromClients(): Promise<string | null> {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })

  for (const client of clients) {
    const token = await new Promise<string | null>((resolve) => {
      const channel = new MessageChannel()
      const timeout = self.setTimeout(() => {
        channel.port1.close()
        resolve(null)
      }, AUTH_TOKEN_TIMEOUT_MILLISECONDS)

      channel.port1.onmessage = (event: MessageEvent<IPwaAuthTokenReply>) => {
        self.clearTimeout(timeout)
        channel.port1.close()
        resolve(event.data?.accessToken ?? null)
      }

      client.postMessage({ type: 'PWA_REQUEST_AUTH_TOKEN' }, [channel.port2])
    })

    if (token) {
      return token
    }
  }

  return null
}

/**
 * Rebuild the queued request with a live bearer token. Throwing when no token
 * is available keeps the draft queued (retried on the next sync/app open)
 * instead of burning a retry attempt or archiving it as failed.
 */
async function attachFreshAuthorization(request: Request): Promise<Request> {
  const token = await requestAuthTokenFromClients()
  if (!token) {
    throw new Error(AUTH_UNAVAILABLE_MESSAGE)
  }

  const headers = new Headers(request.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return new Request(request, { headers })
}

async function getQueueStatus(): Promise<IPwaQueueStatus> {
  const [pendingEntries, failedDrafts, syncMeta] = await Promise.all([
    draftQueue.getAll(),
    listFailedDrafts(),
    readSyncMeta(),
  ])

  return {
    pendingCount: pendingEntries.length,
    failedCount: failedDrafts.filter((draft) => draft.status === 'failed').length,
    conflictCount: failedDrafts.filter((draft) => draft.status === 'conflict').length,
    isSyncing: syncMeta.isSyncing,
    lastSyncedAt: syncMeta.lastSyncedAt,
    errorMessage: syncMeta.errorMessage,
  }
}

async function broadcastQueueStatus(
  type: 'PWA_QUEUE_STATUS' | 'PWA_SYNC_STARTED' | 'PWA_SYNC_COMPLETED' | 'PWA_SYNC_FAILED',
): Promise<IPwaQueueStatus> {
  const status = await getQueueStatus()
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  clients.forEach((client) => client.postMessage({ type, payload: status }))
  return status
}

async function archiveFailedRequest(
  request: Request,
  metadata: IQueueMetadata,
  status: 'failed' | 'conflict',
  errorMessage: string,
): Promise<void> {
  await saveFailedDraft(request, {
    status,
    attempts: metadata.attempts,
    createdAt: metadata.createdAt,
    expiresAt: metadata.createdAt + RETENTION_MILLISECONDS,
    lastError: errorMessage,
  })
}

async function replayDraftQueue(queue: Queue, isManualRetry = false): Promise<void> {
  const previousMeta = await readSyncMeta()
  await writeSyncMeta({
    isSyncing: true,
    lastSyncedAt: previousMeta.lastSyncedAt,
    errorMessage: null,
  })
  await broadcastQueueStatus('PWA_SYNC_STARTED')

  const entries = await queue.getAll()
  let retryError: Error | null = null
  let sentCount = 0

  for (let index = 0; index < entries.length; index += 1) {
    const entry = await queue.shiftRequest()
    if (!entry) {
      break
    }

    const metadata = parseQueueMetadata(entry.metadata)

    try {
      const authorizedRequest = await attachFreshAuthorization(entry.request.clone())
      const response = await fetch(authorizedRequest)

      if (AUTH_STATUS_CODES.has(response.status)) {
        // Expired/rejected session: requeue untouched (no attempt burned) so a
        // later replay with a valid session can still deliver the draft.
        await queue.unshiftRequest({
          request: entry.request,
          timestamp: entry.timestamp,
          metadata,
        })
        retryError = new Error(AUTH_UNAVAILABLE_MESSAGE)
        break
      }

      if (response.status === 409) {
        await archiveFailedRequest(
          entry.request,
          metadata,
          'conflict',
          'Draft berubah di perangkat lain dan perlu diperiksa.',
        )
        continue
      }

      if (isRetryableResponse(response)) {
        throw new Error(`Layanan belum siap (${response.status}).`)
      }

      if (!response.ok) {
        await archiveFailedRequest(
          entry.request,
          metadata,
          'failed',
          'Draft ditolak layanan dan perlu diperiksa kembali.',
        )
        continue
      }

      sentCount += 1
    } catch (error) {
      const errorMessage = getErrorMessage(error)

      if (errorMessage === AUTH_UNAVAILABLE_MESSAGE) {
        // No live session to sign the replay with — keep the draft intact and
        // do NOT count this as a delivery attempt.
        await queue.unshiftRequest({
          request: entry.request,
          timestamp: entry.timestamp,
          metadata,
        })
        retryError = new Error(errorMessage)
        break
      }

      const attempts = metadata.attempts + 1

      if (attempts >= PWA_MAX_RETRY_ATTEMPTS) {
        await archiveFailedRequest(
          entry.request,
          { ...metadata, attempts },
          'failed',
          errorMessage,
        )
        continue
      }

      await queue.unshiftRequest({
        request: entry.request,
        timestamp: entry.timestamp,
        metadata: { ...metadata, attempts },
      })
      retryError = new Error(errorMessage)
      break
    }
  }

  const completedAt = sentCount > 0 ? Date.now() : previousMeta.lastSyncedAt
  await writeSyncMeta({
    isSyncing: false,
    lastSyncedAt: completedAt,
    errorMessage: retryError?.message ?? null,
  })

  if (retryError) {
    await broadcastQueueStatus('PWA_SYNC_FAILED')
    if (!isManualRetry) {
      throw retryError
    }
    return
  }

  await broadcastQueueStatus('PWA_SYNC_COMPLETED')
}

const draftQueue = new Queue(PWA_DRAFT_QUEUE_NAME, {
  maxRetentionTime: PWA_QUEUE_RETENTION_MINUTES,
  onSync: ({ queue }) => replayDraftQueue(queue),
})

async function queueDraftRequest(request: Request, reason: unknown): Promise<Response> {
  const preparedRequest = ensureIdempotencyKey(request)

  try {
    // Persist WITHOUT the bearer token; replay attaches a fresh one.
    await draftQueue.pushRequest({
      request: stripAuthorization(preparedRequest.request.clone()),
      metadata: { attempts: 0, createdAt: Date.now() } satisfies IQueueMetadata,
    })
    await writeSyncMeta({
      isSyncing: false,
      lastSyncedAt: (await readSyncMeta()).lastSyncedAt,
      errorMessage: null,
    })
    await broadcastQueueStatus('PWA_QUEUE_STATUS')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Draft disimpan di perangkat dan menunggu terkirim.',
        data: {
          queued: true,
          idempotencyKey: preparedRequest.idempotencyKey,
        },
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (storageError) {
    const message = `Draft tidak dapat disimpan di perangkat: ${getErrorMessage(storageError)}`
    const previousMeta = await readSyncMeta().catch(() => ({
      key: 'queue-status' as const,
      isSyncing: false,
      lastSyncedAt: null,
      errorMessage: null,
    }))
    await writeSyncMeta({
      isSyncing: false,
      lastSyncedAt: previousMeta.lastSyncedAt,
      errorMessage: message,
    }).catch(() => undefined)
    await broadcastQueueStatus('PWA_SYNC_FAILED').catch(() => undefined)

    return new Response(
      JSON.stringify({
        success: false,
        message,
        data: { queued: false, reason: getErrorMessage(reason) },
      }),
      { status: 507, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

async function handleDraftMutation(request: Request): Promise<Response> {
  const preparedRequest = ensureIdempotencyKey(request)

  try {
    const response = await fetch(preparedRequest.request.clone())
    if (isRetryableResponse(response)) {
      return queueDraftRequest(preparedRequest.request, new Error(`Layanan merespons ${response.status}.`))
    }
    return response
  } catch (error) {
    return queueDraftRequest(preparedRequest.request, error)
  }
}

async function restoreFailedDraftsToQueue(): Promise<void> {
  const failedDrafts = await listFailedDrafts()
  const retryableDrafts = failedDrafts.filter((draft) => draft.status === 'failed')

  for (const draft of retryableDrafts) {
    await draftQueue.pushRequest({
      request: restoreFailedDraftRequest(draft),
      timestamp: draft.createdAt,
      metadata: { attempts: 0, createdAt: draft.createdAt } satisfies IQueueMetadata,
    })
    await deleteFailedDraft(draft.id)
  }
}

async function clearLocalDrafts(): Promise<void> {
  let entry = await draftQueue.shiftRequest()
  while (entry) {
    entry = await draftQueue.shiftRequest()
  }
  await clearFailedDrafts()
  await writeSyncMeta({ isSyncing: false, lastSyncedAt: null, errorMessage: null })
  await broadcastQueueStatus('PWA_QUEUE_STATUS')
}

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ request }) => request.mode === 'navigate',
  createHandlerBoundToURL('/index.html'),
)

registerRoute(
  ({ request, url }) => url.origin === self.location.origin && request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'siaga-padi-images',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
)

;(['POST', 'PUT', 'PATCH'] as const).forEach((method) => {
  registerRoute(
    ({ request, url }) => isDraftMutationRequest(request, url),
    ({ request }) => handleDraftMutation(request),
    method,
  )
})

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const message = event.data as TPwaWorkerRequest | undefined
  const replyPort = event.ports[0]

  if (!message) {
    return
  }

  if (message.type === 'SKIP_WAITING') {
    void self.skipWaiting()
    return
  }

  const respond = async (): Promise<void> => {
    try {
      if (message.type === 'PWA_RETRY_QUEUE') {
        await restoreFailedDraftsToQueue()
        await replayDraftQueue(draftQueue, true)
      }

      if (message.type === 'PWA_CLEAR_LOCAL_DRAFTS') {
        await clearLocalDrafts()
      }

      const response: IPwaWorkerResponse = { ok: true, status: await getQueueStatus() }
      replyPort?.postMessage(response)
    } catch (error) {
      const response: IPwaWorkerResponse = {
        ok: false,
        errorMessage: getErrorMessage(error),
        status: await getQueueStatus().catch(() => undefined),
      }
      replyPort?.postMessage(response)
    }
  }

  event.waitUntil(respond())
})
