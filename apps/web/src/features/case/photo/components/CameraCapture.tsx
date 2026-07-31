import { useEffect, useRef, useState } from 'react'
import type { RejectReason } from '@/types/siaga-photo'
import { CAMERA_TIPS, PRIVACY_NOTE, RETAKE_TIPS } from '../photo-labels'

const CAPTURE_JPEG_QUALITY = 0.92
const FALLBACK_CAPTURE_WIDTH = 1280
const FALLBACK_CAPTURE_HEIGHT = 720

type TCameraState = 'starting' | 'ready' | 'unavailable'

interface CameraCaptureProps {
  /** "Foto 1 dari 2 (maks 3)" — FR-003 counter. */
  counterLabel: string
  /** Reasons from the last rejection — preloads reason-specific tips. */
  retakeReasons?: RejectReason[]
  /** Shown when arriving from a reviewer's "perlu foto ulang" request. */
  reviewerNote?: string | null
  onCapture: (blob: Blob, previewUrl: string) => void
}

/**
 * Kamera penuh-layar dengan bingkai panduan (FR-003). Kamera tidak tersedia
 * atau izin ditolak → fallback unggah galeri dengan panduan yang sama —
 * alur TIDAK pernah buntu hanya karena kamera gagal.
 */
function CameraCapture({
  counterLabel,
  retakeReasons = [],
  reviewerNote = null,
  onCapture,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraState, setCameraState] = useState<TCameraState>('starting')

  useEffect(() => {
    let isActive = true
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unavailable')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCameraState('ready')
      } catch {
        if (isActive) {
          setCameraState('unavailable')
        }
      }
    }
    startCamera()
    return () => {
      isActive = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const handleShutter = () => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || FALLBACK_CAPTURE_WIDTH
    canvas.height = video.videoHeight || FALLBACK_CAPTURE_HEIGHT
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob, URL.createObjectURL(blob))
        }
      },
      'image/jpeg',
      CAPTURE_JPEG_QUALITY
    )
  }

  const handleGalleryPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onCapture(file, URL.createObjectURL(file))
    }
    event.target.value = ''
  }

  const guidance = (
    <div className="flex flex-col gap-2">
      {reviewerNote && (
        <p
          data-testid="reviewer-note"
          className="rounded-xl border border-primary-soft bg-primary-light p-3 text-body-sm text-primary-deep"
        >
          <i className="ph ph-chat-circle-text mr-1" aria-hidden="true" />
          Catatan penyuluh: {reviewerNote}
        </p>
      )}
      {retakeReasons.map((reason) => (
        <p
          key={reason}
          data-testid="retake-tip"
          className="rounded-xl border border-border-primary bg-background-primary p-3 text-body-sm text-font-primary"
        >
          <i className="ph ph-lightbulb mr-1 text-primary-base" aria-hidden="true" />
          {RETAKE_TIPS[reason].tip}
        </p>
      ))}
    </div>
  )

  if (cameraState === 'unavailable') {
    return (
      <section className="flex w-full flex-col gap-4" aria-label="Unggah dari galeri">
        <p className="text-body-md text-font-secondary">
          Kamera tidak tersedia. Pilih foto daun dari galeri — panduannya sama:
          satu daun memenuhi bingkai, terang, dan tajam.
        </p>
        <p
          data-testid="camera-counter"
          className="w-fit rounded-lg bg-primary-light px-3 py-1 text-body-sm font-semibold text-primary-deep"
        >
          {counterLabel}
        </p>
        {guidance}
        <ul className="flex flex-col gap-1">
          {CAMERA_TIPS.map((tip) => (
            <li key={tip} className="flex items-center gap-2 text-body-sm text-font-secondary">
              <i className="ph ph-check text-primary-base" aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>
        <label className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-base px-5 py-3 text-body-md font-semibold text-font-on-accent transition-colors hover:bg-primary-bold">
          <i className="ph ph-images" aria-hidden="true" />
          Pilih dari Galeri
          <input
            data-testid="camera-fallback-input"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleGalleryPick}
          />
        </label>
        <p className="text-body-sm text-font-secondary">
          <i className="ph ph-shield-check mr-1 text-primary-base" aria-hidden="true" />
          {PRIVACY_NOTE}
        </p>
      </section>
    )
  }

  return (
    <section
      className="fixed inset-0 z-50 flex flex-col bg-black"
      aria-label="Kamera pengambilan foto daun"
    >
      <video
        ref={videoRef}
        data-testid="camera-video"
        className="h-full w-full object-cover"
        playsInline
        muted
      />

      {/* Bingkai panduan: daun harus memenuhi area ini. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[62%] w-[78%] rounded-3xl border-4 border-dashed border-white/80" />
      </div>

      <div className="absolute inset-x-0 top-0 flex flex-col gap-2 bg-gradient-to-b from-black/70 to-transparent p-4">
        <p
          data-testid="camera-counter"
          className="w-fit rounded-lg bg-white/90 px-3 py-1 text-body-sm font-semibold text-primary-deep"
        >
          {counterLabel}
        </p>
        <p className="text-body-sm text-white/90">Isi bingkai dengan satu daun · cari cahaya terang</p>
        {guidance}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-6">
        <button
          type="button"
          data-testid="camera-shutter"
          onClick={handleShutter}
          aria-label="Jepret foto"
          className="flex size-18 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-95"
        >
          <span className="size-13 rounded-full bg-white" />
        </button>
        <p className="text-body-sm text-white/80">{PRIVACY_NOTE}</p>
      </div>
    </section>
  )
}

export default CameraCapture
