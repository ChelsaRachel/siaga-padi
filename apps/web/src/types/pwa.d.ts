export type TPwaFailedDraftStatus = 'failed' | 'conflict'

export interface IPwaQueueStatus {
  pendingCount: number
  failedCount: number
  conflictCount: number
  isSyncing: boolean
  lastSyncedAt: number | null
  errorMessage: string | null
}

export type TPwaWorkerMessage =
  | { type: 'PWA_QUEUE_STATUS'; payload: IPwaQueueStatus }
  | { type: 'PWA_SYNC_STARTED'; payload: IPwaQueueStatus }
  | { type: 'PWA_SYNC_COMPLETED'; payload: IPwaQueueStatus }
  | { type: 'PWA_SYNC_FAILED'; payload: IPwaQueueStatus }
  /**
   * Worker → page: replay needs a FRESH access token. Bearer tokens are
   * never persisted in the queue, so the page answers from the auth store
   * over the provided MessageChannel port.
   */
  | { type: 'PWA_REQUEST_AUTH_TOKEN' }

/** Page → worker reply carrying the current access token (null if signed out). */
export interface IPwaAuthTokenReply {
  accessToken: string | null
}

export type TPwaWorkerRequest =
  | { type: 'PWA_GET_QUEUE_STATUS' }
  | { type: 'PWA_RETRY_QUEUE' }
  | { type: 'PWA_CLEAR_LOCAL_DRAFTS' }
  | { type: 'SKIP_WAITING' }

export interface IPwaWorkerResponse {
  ok: boolean
  status?: IPwaQueueStatus
  errorMessage?: string
}

export interface IPwaRegistrationConfig {
  onRegistered?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

