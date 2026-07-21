// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PWA_IDEMPOTENCY_HEADER } from '@/config/pwa-config'
import {
  clearFailedDrafts,
  deleteFailedDraft,
  listFailedDrafts,
  readSyncMeta,
  restoreFailedDraftRequest,
  saveFailedDraft,
  writeSyncMeta,
} from './offline-draft-storage.service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function buildDraftOptions(overrides: Partial<Parameters<typeof saveFailedDraft>[1]> = {}) {
  return {
    status: 'failed' as const,
    attempts: 1,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    lastError: 'Gagal terkirim.',
    ...overrides,
  }
}

describe('offline-draft-storage.service', () => {
  beforeEach(async () => {
    await clearFailedDrafts()
    await writeSyncMeta({ isSyncing: false, lastSyncedAt: null, errorMessage: null })
  })

  describe('saveFailedDraft', () => {
    it('keys the record by the Idempotency-Key header when present', async () => {
      const request = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'case-123' },
        body: JSON.stringify({ note: 'draft' }),
      })

      const record = await saveFailedDraft(request, buildDraftOptions())

      expect(record.id).toBe('case-123')
    })

    it('falls back to a generated id when no Idempotency-Key header is present', async () => {
      const request = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        body: JSON.stringify({ note: 'draft' }),
      })

      const record = await saveFailedDraft(request, buildDraftOptions())

      expect(record.id).toMatch(UUID_PATTERN)
    })

    it('strips the Authorization header before persisting the request', async () => {
      const request = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        headers: {
          [PWA_IDEMPOTENCY_HEADER]: 'case-auth',
          Authorization: 'Bearer secret-token',
        },
        body: JSON.stringify({ note: 'draft' }),
      })

      await saveFailedDraft(request, buildDraftOptions())
      const [record] = await listFailedDrafts()
      const restored = restoreFailedDraftRequest(record)

      expect(restored.headers.get('authorization')).toBeNull()
    })

    it('does not read a body for GET requests', async () => {
      const request = new Request('https://api.siaga-padi.test/cases', {
        method: 'GET',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'case-get' },
      })

      const record = await saveFailedDraft(request, buildDraftOptions())

      expect(record.request.body).toBeNull()
    })

    it('does not read a body for HEAD requests', async () => {
      const request = new Request('https://api.siaga-padi.test/cases', {
        method: 'HEAD',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'case-head' },
      })

      const record = await saveFailedDraft(request, buildDraftOptions())

      expect(record.request.body).toBeNull()
    })

    it('falls back to a timestamp-based id when crypto.randomUUID is unavailable', async () => {
      const original = crypto.randomUUID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(crypto as any).randomUUID = undefined

      try {
        const request = new Request('https://api.siaga-padi.test/cases', {
          method: 'POST',
          body: JSON.stringify({ note: 'draft' }),
        })
        const record = await saveFailedDraft(request, buildDraftOptions())

        expect(record.id).toMatch(/^\d+-[a-z0-9]+$/)
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(crypto as any).randomUUID = original
      }
    })
  })

  describe('listFailedDrafts', () => {
    it('returns only records that have not expired', async () => {
      const now = Date.now()
      const activeRequest = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'active' },
        body: '{}',
      })
      const expiredRequest = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'expired' },
        body: '{}',
      })

      await saveFailedDraft(activeRequest, buildDraftOptions({ createdAt: now, expiresAt: now + 60_000 }))
      await saveFailedDraft(expiredRequest, buildDraftOptions({ createdAt: now - 120_000, expiresAt: now - 60_000 }))

      const active = await listFailedDrafts()

      expect(active.map((record) => record.id)).toEqual(['active'])
    })

    it('evicts expired records so they are not returned again', async () => {
      const now = Date.now()
      const expiredRequest = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'expired-twice' },
        body: '{}',
      })
      await saveFailedDraft(expiredRequest, buildDraftOptions({ createdAt: now - 120_000, expiresAt: now - 1 }))

      await listFailedDrafts()
      const secondRead = await listFailedDrafts()

      expect(secondRead).toHaveLength(0)
    })
  })

  describe('deleteFailedDraft / clearFailedDrafts', () => {
    it('removes a single record by id', async () => {
      const requestA = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'draft-a' },
        body: '{}',
      })
      const requestB = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'draft-b' },
        body: '{}',
      })
      await saveFailedDraft(requestA, buildDraftOptions())
      await saveFailedDraft(requestB, buildDraftOptions())

      await deleteFailedDraft('draft-a')
      const remaining = await listFailedDrafts()

      expect(remaining.map((record) => record.id)).toEqual(['draft-b'])
    })

    it('removes every record', async () => {
      const request = new Request('https://api.siaga-padi.test/cases', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'draft-clear' },
        body: '{}',
      })
      await saveFailedDraft(request, buildDraftOptions())

      await clearFailedDrafts()

      expect(await listFailedDrafts()).toHaveLength(0)
    })
  })

  describe('sync meta', () => {
    it('returns a default, idle meta record when nothing has been written', async () => {
      const meta = await readSyncMeta()

      expect(meta).toEqual({
        key: 'queue-status',
        isSyncing: false,
        lastSyncedAt: null,
        errorMessage: null,
      })
    })

    it('persists and reads back an updated meta record', async () => {
      await writeSyncMeta({ isSyncing: true, lastSyncedAt: 1_700_000_000_000, errorMessage: null })

      const meta = await readSyncMeta()

      expect(meta).toEqual({
        key: 'queue-status',
        isSyncing: true,
        lastSyncedAt: 1_700_000_000_000,
        errorMessage: null,
      })
    })
  })

  describe('restoreFailedDraftRequest', () => {
    it('reconstructs a Request with the original url and method', async () => {
      const request = new Request('https://api.siaga-padi.test/cases/42', {
        method: 'POST',
        headers: { [PWA_IDEMPOTENCY_HEADER]: 'restore-me' },
        body: '{}',
      })
      await saveFailedDraft(request, buildDraftOptions())
      const [record] = await listFailedDrafts()

      const restored = restoreFailedDraftRequest(record)

      expect(restored.url).toBe('https://api.siaga-padi.test/cases/42')
      expect(restored.method).toBe('POST')
    })
  })

  describe('browser support', () => {
    it('rejects when the environment has no IndexedDB implementation', async () => {
      const originalIndexedDB = globalThis.indexedDB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).indexedDB

      vi.resetModules()
      try {
        const freshModule = await import('./offline-draft-storage.service')
        await expect(freshModule.readSyncMeta()).rejects.toThrow(
          'Browser ini tidak mendukung penyimpanan draft offline.',
        )
      } finally {
        globalThis.indexedDB = originalIndexedDB
        vi.resetModules()
      }
    })
  })
})
