import { describe, expect, test } from 'vitest'
import type { RejectReason } from '@/types/siaga-photo'
import { QUALITY_STATUS_LABELS, REJECT_REASON_LABELS, RETAKE_TIPS } from './photo-labels'

const ALL_REASONS: RejectReason[] = ['buram', 'gelap', 'terlalu_jauh', 'bukan_daun', 'resolusi_rendah']

describe('photo-labels', () => {
  test('every reject reason maps to a label and a full retake tip', () => {
    for (const reason of ALL_REASONS) {
      expect(REJECT_REASON_LABELS[reason]).toBeTruthy()
      expect(RETAKE_TIPS[reason].tip).toBeTruthy()
      expect(RETAKE_TIPS[reason].before).toBeTruthy()
      expect(RETAKE_TIPS[reason].after).toBeTruthy()
    }
  })

  test('every quality status has a petani-facing label', () => {
    expect(Object.keys(QUALITY_STATUS_LABELS).sort()).toEqual(['ambang', 'ditolak', 'layak', 'tidak_pasti'].sort())
  })

  test('labels never expose technical scoring vocabulary', () => {
    const allText = JSON.stringify({ REJECT_REASON_LABELS, RETAKE_TIPS })
    for (const banned of ['skor', 'score', 'laplacian', 'varian', 'threshold']) {
      expect(allText.toLowerCase()).not.toContain(banned)
    }
  })
})
