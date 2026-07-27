import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { StepLahan, StepLokasiFase, StepRingkasan, useCaseWizardStore } from '@/features/case/create'
import { WizardProgress } from './parts/WizardProgress'

/**
 * "Periksa Tanaman" — wizard maks 3 langkah dengan tombol besar:
 * (1) lahan + panel tujuan data → (2) lokasi (GPS opsional) + fase →
 * (3) konfirmasi + kirim → kasus DRAF → alur foto (placeholder Sprint 03).
 *
 * State lives in `useCaseWizardStore` so back navigation preserves every
 * input and the idempotency key survives retries.
 */
function CaseCreatePage() {
  const step = useCaseWizardStore((state) => state.step)
  const setStep = useCaseWizardStore((state) => state.setStep)
  const isQueuedNoticeVisible = useCaseWizardStore((state) => state.isQueuedNoticeVisible)
  const dismissQueuedNotice = useCaseWizardStore((state) => state.dismissQueuedNotice)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-h4 font-bold text-font-primary">Periksa Tanaman</h1>
        <p className="mt-1 text-body-md text-font-secondary">
          Tiga langkah singkat, lalu lanjut ke foto tanaman.
        </p>
      </div>

      {isQueuedNoticeVisible ? (
        <Alert data-testid="wizard-submit-queued">
          <AlertTitle className="text-body-lg font-semibold">
            Draft tersimpan di perangkat
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-body-md">
            <span>
              Jaringan sedang tidak tersedia, jadi kasus ini belum terkirim ke server. Draft
              otomatis terkirim saat Anda kembali online — tidak perlu mengisi ulang. Status
              pengirimannya bisa dipantau di banner sinkronisasi.
            </span>
            <span className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="lg"
                className="rounded-xl font-semibold"
                onClick={dismissQueuedNotice}
                data-testid="wizard-queued-new-case"
              >
                <i className="ph ph-plus text-h6" aria-hidden="true" />
                Buat Kasus Lain
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                size="lg"
                className="rounded-xl font-semibold"
              >
                <Link to="/riwayat">Lihat Riwayat</Link>
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <WizardProgress step={step} />

          {step === 1 && <StepLahan onNext={() => setStep(2)} />}
          {step === 2 && <StepLokasiFase onBack={() => setStep(1)} onNext={() => setStep(3)} />}
          {step === 3 && <StepRingkasan onBack={() => setStep(2)} />}
        </>
      )}
    </div>
  )
}

export default CaseCreatePage
