import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import CameraCapture from './CameraCapture'

/**
 * jsdom has no `navigator.mediaDevices`, so these tests exercise the
 * REAL fallback branch (FR-003): camera unavailable → gallery upload with
 * the same guidance.
 */
describe('CameraCapture — gallery fallback branch', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  test('camera unavailable shows the gallery input with the same guidance', async () => {
    // Arrange + Act
    render(
      <CameraCapture counterLabel="Foto 1 dari 2 (maks 3)" onCapture={vi.fn()} />
    )

    // Assert — fallback input + counter + privacy note all present
    expect(await screen.findByTestId('camera-fallback-input')).toBeInTheDocument()
    expect(screen.getByTestId('camera-counter')).toHaveTextContent(
      'Foto 1 dari 2 (maks 3)'
    )
    expect(screen.getByText(/EXIF/)).toBeInTheDocument()
  })

  test('picking a gallery file fires onCapture with the file', async () => {
    const onCapture = vi.fn()
    render(<CameraCapture counterLabel="Foto 1 dari 2 (maks 3)" onCapture={onCapture} />)
    const input = await screen.findByTestId('camera-fallback-input')

    const file = new File(['leaf-bytes'], 'daun.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(onCapture).toHaveBeenCalledWith(file, 'blob:mock-preview')
  })

  test('retake reasons preload reason-specific tips in the fallback view', async () => {
    render(
      <CameraCapture
        counterLabel="Foto 2 dari 2 (maks 3)"
        retakeReasons={['buram', 'gelap']}
        onCapture={vi.fn()}
      />
    )

    const tips = await screen.findAllByTestId('retake-tip')
    expect(tips).toHaveLength(2)
    expect(tips[0]).toHaveTextContent(/fokus/i)
  })

  test('reviewer note is shown when arriving from "perlu foto ulang"', async () => {
    render(
      <CameraCapture
        counterLabel="Foto 1 dari 2 (maks 3)"
        reviewerNote="Ambil foto bagian daun yang menguning"
        onCapture={vi.fn()}
      />
    )

    expect(await screen.findByTestId('reviewer-note')).toHaveTextContent(
      'Ambil foto bagian daun yang menguning'
    )
  })
})
