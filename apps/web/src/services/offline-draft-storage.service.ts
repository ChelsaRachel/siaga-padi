import type { TPwaFailedDraftStatus } from '@/types/pwa'
import { PWA_IDEMPOTENCY_HEADER } from '@/config/pwa-config'

const DATABASE_NAME = 'siaga-padi-pwa'
const DATABASE_VERSION = 1
const FAILED_DRAFTS_STORE = 'failed-drafts'
const SYNC_META_STORE = 'sync-meta'
const SYNC_META_KEY = 'queue-status'

interface IStoredRequest {
  url: string
  method: string
  headers: Array<[string, string]>
  body: ArrayBuffer | null
  credentials: RequestCredentials
  mode: RequestMode
  redirect: RequestRedirect
}

export interface IFailedDraftRecord {
  id: string
  request: IStoredRequest
  status: TPwaFailedDraftStatus
  attempts: number
  createdAt: number
  expiresAt: number
  lastError: string
}

export interface ISyncMeta {
  key: typeof SYNC_META_KEY
  isSyncing: boolean
  lastSyncedAt: number | null
  errorMessage: string | null
}

let databasePromise: Promise<IDBDatabase> | null = null

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Penyimpanan lokal gagal diakses.'))
  })
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Perubahan draft lokal gagal disimpan.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Perubahan draft lokal dibatalkan.'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in globalThis)) {
    return Promise.reject(new Error('Browser ini tidak mendukung penyimpanan draft offline.'))
  }

  if (databasePromise) {
    return databasePromise
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(FAILED_DRAFTS_STORE)) {
        database.createObjectStore(FAILED_DRAFTS_STORE, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(SYNC_META_STORE)) {
        database.createObjectStore(SYNC_META_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      databasePromise = null
      reject(request.error ?? new Error('Penyimpanan draft offline gagal dibuka.'))
    }
  })

  return databasePromise
}

async function serializeRequest(request: Request): Promise<IStoredRequest> {
  const headers = Array.from(request.headers.entries()).filter(
    ([name]) => name.toLowerCase() !== 'authorization',
  )
  const canHaveBody = request.method !== 'GET' && request.method !== 'HEAD'

  return {
    url: request.url,
    method: request.method,
    headers,
    body: canHaveBody ? await request.clone().arrayBuffer() : null,
    credentials: request.credentials,
    mode: request.mode,
    redirect: request.redirect,
  }
}

export function restoreFailedDraftRequest(record: IFailedDraftRecord): Request {
  return new Request(record.request.url, {
    method: record.request.method,
    headers: record.request.headers,
    body: record.request.body,
    credentials: record.request.credentials,
    mode: record.request.mode,
    redirect: record.request.redirect,
  })
}

export async function saveFailedDraft(
  request: Request,
  options: {
    status: TPwaFailedDraftStatus
    attempts: number
    createdAt: number
    expiresAt: number
    lastError: string
  },
): Promise<IFailedDraftRecord> {
  const database = await openDatabase()
  const idempotencyKey = request.headers.get(PWA_IDEMPOTENCY_HEADER)
  const record: IFailedDraftRecord = {
    id: idempotencyKey ?? (
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    ),
    request: await serializeRequest(request),
    ...options,
  }
  const transaction = database.transaction(FAILED_DRAFTS_STORE, 'readwrite')
  transaction.objectStore(FAILED_DRAFTS_STORE).put(record)
  await transactionToPromise(transaction)
  return record
}

export async function listFailedDrafts(): Promise<IFailedDraftRecord[]> {
  const database = await openDatabase()
  const transaction = database.transaction(FAILED_DRAFTS_STORE, 'readwrite')
  const transactionComplete = transactionToPromise(transaction)
  const store = transaction.objectStore(FAILED_DRAFTS_STORE)
  const records = await requestToPromise(store.getAll() as IDBRequest<IFailedDraftRecord[]>)
  const now = Date.now()
  const activeRecords = records.filter((record) => record.expiresAt > now)

  records
    .filter((record) => record.expiresAt <= now)
    .forEach((record) => store.delete(record.id))

  await transactionComplete
  return activeRecords
}

export async function deleteFailedDraft(id: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(FAILED_DRAFTS_STORE, 'readwrite')
  transaction.objectStore(FAILED_DRAFTS_STORE).delete(id)
  await transactionToPromise(transaction)
}

export async function clearFailedDrafts(): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(FAILED_DRAFTS_STORE, 'readwrite')
  transaction.objectStore(FAILED_DRAFTS_STORE).clear()
  await transactionToPromise(transaction)
}

export async function readSyncMeta(): Promise<ISyncMeta> {
  const database = await openDatabase()
  const transaction = database.transaction(SYNC_META_STORE, 'readonly')
  const transactionComplete = transactionToPromise(transaction)
  const result = await requestToPromise(
    transaction.objectStore(SYNC_META_STORE).get(SYNC_META_KEY) as IDBRequest<ISyncMeta | undefined>,
  )
  await transactionComplete

  return result ?? {
    key: SYNC_META_KEY,
    isSyncing: false,
    lastSyncedAt: null,
    errorMessage: null,
  }
}

export async function writeSyncMeta(meta: Omit<ISyncMeta, 'key'>): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(SYNC_META_STORE, 'readwrite')
  transaction.objectStore(SYNC_META_STORE).put({ key: SYNC_META_KEY, ...meta })
  await transactionToPromise(transaction)
}
