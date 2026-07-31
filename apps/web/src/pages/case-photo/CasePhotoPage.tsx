import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  CameraCapture,
  EscalateSection,
  PhotoExamples,
  PhotoPreview,
  QualityResultCard,
  RetakeTipsPanel,
  UploadProgressCard,
  buildCounterLabel,
  selectShouldAutoContinue,
  usePhotoFlowStore,
  PHOTO_SLOTS,
} from '@/features/case/photo'
import { casesService } from '@/services/cases.service'

interface PhotoRouteState {
  caseCode?: string
  /** Set when arriving from a reviewer's "perlu foto ulang" request. */
  reviewerNote?: string
}

const DUPLICATE_NOTICE =
  'Foto yang sama sudah terkirim untuk kasus ini — silakan ambil foto lain.'

/**
 * Alur foto Sprint 03 (FR-003/FR-004): contoh baik/buruk → kamera terpandu
 * (fallback galeri) → pratinjau → unggah dengan progres → kartu kualitas +
 * tips foto ulang → escalate setelah 3× gagal → auto-lanjut saat 2 foto
 * diterima (route analisis = detail kasus, placeholder sampai Sprint 05).
 */
function CasePhotoPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = (location.state as PhotoRouteState | null) ?? null

  const [caseCode, setCaseCode] = useState<string | null>(routeState?.caseCode ?? null)
  const [isDuplicateNoticeVisible, setIsDuplicateNoticeVisible] = useState(false)

  const step = usePhotoFlowStore((state) => state.step)
  const slots = usePhotoFlowStore((state) => state.slots)
  const activeSlot = usePhotoFlowStore((state) => state.activeSlot)
  const pendingCapture = usePhotoFlowStore((state) => state.pendingCapture)
  const acceptedCount = usePhotoFlowStore((state) => state.acceptedCount)
  const canEscalate = usePhotoFlowStore((state) => state.canEscalate)
  const needsHumanReview = usePhotoFlowStore((state) => state.needsHumanReview)
  const isEscalating = usePhotoFlowStore((state) => state.isEscalating)
  const escalateError = usePhotoFlowStore((state) => state.escalateError)

  /* Reset + hydrate server state per case. */
  useEffect(() => {
    const store = usePhotoFlowStore.getState()
    store.reset()
    if (caseId) {
      store.syncFromServer(caseId)
    }
    return () => usePhotoFlowStore.getState().reset()
  }, [caseId])

  /* Case code for the header (route state, or fetched on direct open). */
  useEffect(() => {
    if (caseCode || !caseId) {
      return
    }
    let isActive = true
    casesService
      .getOne(caseId)
      .then((response) => {
        if (isActive) {
          setCaseCode(response?.data?.caseCode ?? null)
        }
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [caseId, caseCode])

  /* Connection back → auto re-send photos still waiting on the device. */
  useEffect(() => {
    if (!caseId) {
      return
    }
    const handleOnline = () => {
      usePhotoFlowStore.getState().retryPendingUploads(caseId)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [caseId])

  /* FR-003 auto-continue: 2 accepted photos → analysis route (detail page). */
  useEffect(() => {
    if (caseId && (selectShouldAutoContinue(acceptedCount) || needsHumanReview)) {
      navigate(`/kasus/${caseId}`, {
        replace: true,
        state: { fromPhotoFlow: true },
      })
    }
  }, [acceptedCount, needsHumanReview, caseId, navigate])

  const handleUsePhoto = useCallback(async () => {
    if (!caseId) {
      return
    }
    setIsDuplicateNoticeVisible(false)
    const outcome = await usePhotoFlowStore.getState().confirmCapture(caseId)
    if (outcome === 'duplicate') {
      setIsDuplicateNoticeVisible(true)
    }
  }, [caseId])

  const handleEscalate = useCallback(() => {
    if (caseId) {
      usePhotoFlowStore.getState().escalate(caseId)
    }
  }, [caseId])

  if (!caseId) {
    return null
  }

  const activeResult = slots[activeSlot].result
  const retakeReasons =
    activeResult && activeResult.qualityStatus !== 'layak'
      ? activeResult.rejectReasons
      : []
  const counterLabel = buildCounterLabel(acceptedCount)
  const visibleSlots = PHOTO_SLOTS.filter(
    (slotNo) => slots[slotNo].uploadState !== 'idle'
  )
  const lastRejected =
    activeResult &&
    ['ditolak', 'tidak_pasti'].includes(activeResult.qualityStatus)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-h5 font-bold text-font-primary">Ambil Foto Tanaman</h1>
        {caseCode && (
          <Badge
            data-testid="case-code-badge"
            className="w-fit rounded-lg border-primary-soft bg-primary-light px-3 py-1 text-body-md font-semibold text-primary-deep"
          >
            Kasus {caseCode}
          </Badge>
        )}
      </header>

      {isDuplicateNoticeVisible && (
        <Alert data-testid="duplicate-notice">
          <AlertDescription>{DUPLICATE_NOTICE}</AlertDescription>
        </Alert>
      )}

      {step === 'intro' && (
        <PhotoExamples
          onStart={() => usePhotoFlowStore.getState().setStep('camera')}
        />
      )}

      {step === 'camera' && (
        <CameraCapture
          counterLabel={counterLabel}
          retakeReasons={retakeReasons}
          reviewerNote={routeState?.reviewerNote ?? null}
          onCapture={(blob, previewUrl) =>
            usePhotoFlowStore.getState().capture(blob, previewUrl)
          }
        />
      )}

      {step === 'preview' && pendingCapture && (
        <PhotoPreview
          previewUrl={pendingCapture.previewUrl}
          onRetake={() => usePhotoFlowStore.getState().discardCapture()}
          onUse={handleUsePhoto}
        />
      )}

      {step === 'hasil' && (
        <div className="flex flex-col gap-3">
          {visibleSlots.map((slotNo) => {
            const slot = slots[slotNo]
            return (
              <div key={slotNo} className="flex flex-col gap-3">
                <UploadProgressCard
                  slot={slot}
                  onRetry={() =>
                    usePhotoFlowStore.getState().retryUpload(caseId, slotNo)
                  }
                />
                {slot.result && <QualityResultCard photo={slot.result} />}
              </div>
            )
          })}

          {lastRejected && (
            <RetakeTipsPanel
              reasons={retakeReasons}
              onRetake={() => usePhotoFlowStore.getState().goToRetake(activeSlot)}
            />
          )}

          {!lastRejected &&
            acceptedCount > 0 &&
            !selectShouldAutoContinue(acceptedCount) && (
              <button
                type="button"
                data-testid="next-photo-button"
                onClick={() => usePhotoFlowStore.getState().setStep('camera')}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-base px-5 py-3 text-body-md font-semibold text-font-on-accent transition-colors hover:bg-primary-bold"
              >
                <i className="ph ph-camera" aria-hidden="true" />
                Ambil Foto Berikutnya
              </button>
            )}

          <EscalateSection
            isVisible={canEscalate}
            isEscalating={isEscalating}
            error={escalateError}
            onConfirm={handleEscalate}
          />
        </div>
      )}
    </div>
  )
}

export default CasePhotoPage
