import { describe, expect, test } from 'vitest'
import { fingerprintBlob } from './fingerprint'

describe('fingerprintBlob', () => {
  test('returns a 64-char hex sha256 for blob content', async () => {
    // Arrange
    const blob = new Blob(['siaga-padi-foto'])

    // Act
    const fingerprint = await fingerprintBlob(blob)

    // Assert
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })

  test('same bytes produce the same fingerprint (retry contract)', async () => {
    const first = await fingerprintBlob(new Blob(['identik']))
    const second = await fingerprintBlob(new Blob(['identik']))

    expect(first).toBe(second)
  })

  test('different bytes produce different fingerprints', async () => {
    const first = await fingerprintBlob(new Blob(['foto-satu']))
    const second = await fingerprintBlob(new Blob(['foto-dua']))

    expect(first).not.toBe(second)
  })
})
