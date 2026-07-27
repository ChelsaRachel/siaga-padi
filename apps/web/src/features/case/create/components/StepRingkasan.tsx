import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GROWTH_STAGE_LABELS, LOCATION_MODE_LABELS } from '@/features/case/case-labels'
import { selectProfile, useAuthStore } from '@/stores/useAuthStore'
import { selectAssistedSubject, selectIsAssistedActive, useAssistedStore } from '@/stores/useAssistedStore'
import type { ConsentMethod } from '@/types/siaga-auth'
import { useCreateCase } from '../hooks/useCreateCase'
import { useCaseWizardStore } from '../store/useCaseWizardStore'

interface StepRingkasanProps {
  onBack: () => void
}

const CONSENT_METHOD_LABELS: Record<ConsentMethod, string> = {
  lisan: 'lisan',
  tertulis: 'tertulis',
  in_app: 'dalam aplikasi',
}

interface SummaryRowProps {
  icon: string
  label: string
  value: string
  detail?: string
}

function SummaryRow({ icon, label, value, detail }: SummaryRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <i className={`ph ${icon} shrink-0 text-h5 text-primary-base`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-body-sm text-font-secondary">{label}</p>
        <p className="text-body-md font-semibold text-font-primary">{value}</p>
        {detail && <p className="text-body-sm text-font-secondary">{detail}</p>}
      </div>
    </div>
  )
}

/**
 * Step 3 — konfirmasi: summary card (pemilik, lahan, fase, mode lokasi,
 * status persetujuan) + submit. A failed submit keeps every input in the
 * store and retries with the SAME idempotency key.
 */
export function StepRingkasan({ onBack }: StepRingkasanProps) {
  const draft = useCaseWizardStore((state) => state.draft)
  const profile = useAuthStore(selectProfile)
  const isAssisted = useAssistedStore(selectIsAssistedActive)
  const subject = useAssistedStore(selectAssistedSubject)
  const consentMethod = useAssistedStore((state) => state.consentMethod)
  // A queued (offline) submit is surfaced by CaseCreatePage: queueing resets
  // the wizard to step 1, so a notice rendered here would unmount immediately.
  const { submit, isSubmitting, error } = useCreateCase()

  const ownerName = isAssisted && subject ? subject.displayName : profile?.displayName ?? '—'
  const lahanValue =
    draft.fieldMode === 'existing'
      ? draft.fieldName ?? '—'
      : draft.newFieldName
        ? `${draft.newFieldName} (baru)`
        : '—'
  const locationValue = draft.locationMode ? LOCATION_MODE_LABELS[draft.locationMode] : '—'
  const locationDetail =
    draft.locationMode === 'EXACT_GPS' && draft.coords
      ? 'Titik GPS tersimpan dan hanya dipakai untuk pemeriksaan ini'
      : draft.locationMode === 'AREA_ONLY'
        ? [draft.areaKecamatan, draft.areaKabupaten].filter(Boolean).join(', ')
        : undefined
  const observedAtLabel = draft.observedAt
    ? new Date(draft.observedAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
    : '—'
  const consentValue = isAssisted
    ? `Persetujuan pendampingan tercatat${consentMethod ? ` (${CONSENT_METHOD_LABELS[consentMethod]})` : ''}`
    : `Izin lokasi: ${profile?.locationConsent ? 'Aktif' : 'Nonaktif'} · Izin riset: ${
        profile?.researchConsent ? 'Aktif' : 'Nonaktif'
      }`

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-3xl border-border-primary" data-testid="wizard-summary-card">
        <CardContent className="divide-y divide-border-secondary py-2">
          <SummaryRow
            icon="ph-user"
            label="Pemilik kasus"
            value={ownerName}
            detail={isAssisted ? 'Dibuat atas nama petani yang didampingi' : undefined}
          />
          <SummaryRow icon="ph-plant" label="Lahan" value={lahanValue} />
          <SummaryRow
            icon="ph-leaf"
            label="Fase pertumbuhan"
            value={draft.growthStage ? GROWTH_STAGE_LABELS[draft.growthStage] : '—'}
          />
          <SummaryRow icon="ph-map-pin" label="Mode lokasi" value={locationValue} detail={locationDetail} />
          <SummaryRow icon="ph-clock" label="Waktu pengamatan" value={observedAtLabel} />
          <SummaryRow icon="ph-shield-check" label="Status persetujuan" value={consentValue} />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" data-testid="wizard-submit-error">
          <AlertTitle className="text-body-md font-semibold">Kasus belum terkirim</AlertTitle>
          <AlertDescription className="text-body-md">
            {error} Data isian Anda tetap tersimpan — silakan coba kirim lagi.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-xl text-body-lg font-semibold"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <i className="ph ph-arrow-left text-h6" aria-hidden="true" />
          Kembali
        </Button>
        <Button
          type="button"
          size="lg"
          className="rounded-xl text-body-lg font-semibold"
          onClick={() => submit()}
          disabled={isSubmitting}
          data-testid="wizard-submit-button"
        >
          {isSubmitting ? (
            <>
              <i className="ph ph-circle-notch animate-spin text-h6" aria-hidden="true" />
              Mengirim…
            </>
          ) : error ? (
            <>
              <i className="ph ph-arrow-clockwise text-h6" aria-hidden="true" />
              Coba Kirim Lagi
            </>
          ) : (
            <>
              <i className="ph ph-camera text-h6" aria-hidden="true" />
              Buat Kasus &amp; Lanjut ke Foto
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
