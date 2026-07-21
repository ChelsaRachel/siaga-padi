import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PWA_DRAFT_QUEUE_HEADER,
  PWA_DRAFT_QUEUE_HEADER_VALUE,
  PWA_IDEMPOTENCY_HEADER,
} from '@/config/pwa-config'

vi.mock('./api-client', () => ({
  default: {
    request: vi.fn().mockResolvedValue({ success: true, message: 'ok', data: null }),
    post: vi.fn().mockResolvedValue({ success: true, message: 'ok', data: null }),
  },
}))

import apiClient from './api-client'
import { queueableRequest, queueableUploadRequest, request, uploadRequest } from './api.service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getRequestHeaders(callIndex: number): Record<string, string> {
  const headers = vi.mocked(apiClient.request).mock.calls[callIndex][0].headers
  if (!headers) {
    throw new Error('Expected apiClient.request to be called with headers.')
  }
  return headers as Record<string, string>
}

describe('api.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('request', () => {
    it('passes url/method/data/params/headers straight through to apiClient', async () => {
      await request({
        path: '/cases',
        method: 'post',
        data: { note: 'draft' },
        params: { page: 1 },
        headers: { 'X-Test': 'yes' },
      })

      expect(apiClient.request).toHaveBeenCalledWith({
        url: '/cases',
        method: 'post',
        data: { note: 'draft' },
        params: { page: 1 },
        headers: { 'X-Test': 'yes' },
      })
    })
  })

  describe('queueableRequest', () => {
    it('tags the request with the queue header and a generated idempotency key', async () => {
      await queueableRequest({ path: '/cases', method: 'post', data: { note: 'draft' } })

      const headers = getRequestHeaders(0)
      expect(headers[PWA_DRAFT_QUEUE_HEADER]).toBe(PWA_DRAFT_QUEUE_HEADER_VALUE)
      expect(headers[PWA_IDEMPOTENCY_HEADER]).toMatch(UUID_PATTERN)
    })

    it('uses the caller-supplied idempotency key instead of generating one', async () => {
      await queueableRequest({
        path: '/cases',
        method: 'post',
        data: { note: 'draft' },
        idempotencyKey: 'case-42',
      })

      expect(getRequestHeaders(0)[PWA_IDEMPOTENCY_HEADER]).toBe('case-42')
    })

    it('falls back to a timestamp-based key when crypto.randomUUID is unavailable', async () => {
      const original = crypto.randomUUID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(crypto as any).randomUUID = undefined

      try {
        await queueableRequest({ path: '/cases', method: 'post', data: { note: 'draft' } })
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(crypto as any).randomUUID = original
      }

      expect(getRequestHeaders(0)[PWA_IDEMPOTENCY_HEADER]).toMatch(/^\d+-[a-z0-9]+$/)
    })

    it('preserves caller-supplied headers alongside the queue headers', async () => {
      await queueableRequest({
        path: '/cases',
        method: 'post',
        data: { note: 'draft' },
        headers: { 'X-Custom': 'value' },
      })

      expect(getRequestHeaders(0)['X-Custom']).toBe('value')
    })
  })

  describe('uploadRequest', () => {
    it('posts the form data with a multipart content type and reports progress', async () => {
      const formData = new FormData()
      const onProgress = vi.fn()

      await uploadRequest('/cases/42/photo', formData, onProgress)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/cases/42/photo',
        formData,
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
      )

      const options = vi.mocked(apiClient.post).mock.calls[0][2] as {
        onUploadProgress: (event: { loaded: number; total: number }) => void
      }
      options.onUploadProgress({ loaded: 50, total: 200 })

      expect(onProgress).toHaveBeenCalledWith(25)
    })

    it('does not call onProgress when the upload has no known total', async () => {
      const formData = new FormData()
      const onProgress = vi.fn()

      await uploadRequest('/cases/42/photo', formData, onProgress)

      const options = vi.mocked(apiClient.post).mock.calls[0][2] as {
        onUploadProgress: (event: { loaded: number; total: number }) => void
      }
      options.onUploadProgress({ loaded: 0, total: 0 })

      expect(onProgress).not.toHaveBeenCalled()
    })
  })

  describe('queueableUploadRequest', () => {
    it('merges the multipart header with the queue headers and a generated idempotency key', async () => {
      const formData = new FormData()

      await queueableUploadRequest('/cases/42/photo', formData)

      const options = vi.mocked(apiClient.post).mock.calls[0][2] as {
        headers: Record<string, string>
      }
      expect(options.headers['Content-Type']).toBe('multipart/form-data')
      expect(options.headers[PWA_DRAFT_QUEUE_HEADER]).toBe(PWA_DRAFT_QUEUE_HEADER_VALUE)
      expect(options.headers[PWA_IDEMPOTENCY_HEADER]).toMatch(UUID_PATTERN)
    })

    it('reports upload progress as a rounded percentage', async () => {
      const formData = new FormData()
      const onProgress = vi.fn()

      await queueableUploadRequest('/cases/42/photo', formData, { onProgress })

      const options = vi.mocked(apiClient.post).mock.calls[0][2] as {
        onUploadProgress: (event: { loaded: number; total: number }) => void
      }
      options.onUploadProgress({ loaded: 1, total: 3 })

      expect(onProgress).toHaveBeenCalledWith(33)
    })

    it('does not throw when no onProgress callback is supplied', async () => {
      const formData = new FormData()

      await queueableUploadRequest('/cases/42/photo', formData)

      const options = vi.mocked(apiClient.post).mock.calls[0][2] as {
        onUploadProgress: (event: { loaded: number; total: number }) => void
      }

      expect(() => options.onUploadProgress({ loaded: 1, total: 3 })).not.toThrow()
    })
  })
})
