import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { GrowthStage, LocationMode } from '@/types/siaga-case'
import { cn } from '@/utils/cn'
import { wizardLokasiFaseSchema, type TWizardLokasiFaseValues } from '../case-create.schema'
import { useGeolocation } from '../hooks/useGeolocation'
import { useCaseWizardStore } from '../store/useCaseWizardStore'
import { toDatetimeLocalValue } from '../utils/datetime-local'
import { GrowthStagePicker } from './GrowthStagePicker'

interface StepLokasiFaseProps {
  onBack: () => void
  onNext: () => void
}

const INPUT_CLASSES =
  'h-12 rounded-xl border-border-primary bg-background-primary text-body-lg text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-base'

const OPTION_CLASSES = 'flex min-h-14 w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors'

/**
 * Step 2 — lokasi (GPS opsional → fallback area manual → "belum tahu") +
 * fase + waktu pengamatan. GPS is requested ONLY on explicit tap; a refusal
 * automatically falls back to manual kabupaten→kecamatan input (AREA_ONLY)
 * and never blocks creation.
 */
export function StepLokasiFase({ onBack, onNext }: StepLokasiFaseProps) {
  const draft = useCaseWizardStore((state) => state.draft)
  const updateDraft = useCaseWizardStore((state) => state.updateDraft)
  const [gpsNotice, setGpsNotice] = useState<string | null>(null)

  const form = useForm<TWizardLokasiFaseValues>({
    resolver: yupResolver(wizardLokasiFaseSchema),
    defaultValues: {
      locationMode: draft.locationMode ?? undefined,
      areaKabupaten: draft.areaKabupaten,
      areaKecamatan: draft.areaKecamatan,
      growthStage: draft.growthStage ?? undefined,
      observedAt: draft.observedAt || toDatetimeLocalValue(new Date()),
    },
  })

  const locationMode = form.watch('locationMode')
  const hasStoredCoords = draft.coords !== null

  const { status: gpsStatus, requestLocation } = useGeolocation({
    onGranted: (coords) => {
      updateDraft({ coords })
      setGpsNotice(null)
      form.setValue('locationMode', 'EXACT_GPS', { shouldValidate: true })
    },
    onRefused: (refusal) => {
      updateDraft({ coords: null })
      setGpsNotice(
        refusal === 'denied'
          ? 'Izin lokasi ditolak. Tidak masalah — silakan isi area secara manual di bawah.'
          : 'GPS tidak tersedia di perangkat ini. Silakan isi area secara manual di bawah.'
      )
      form.setValue('locationMode', 'AREA_ONLY', { shouldValidate: true })
    },
  })

  const chooseMode = (mode: LocationMode) => {
    setGpsNotice(null)
    if (mode !== 'EXACT_GPS') {
      updateDraft({ coords: null })
    }
    form.setValue('locationMode', mode, { shouldValidate: true })
  }

  const onSubmit = (values: TWizardLokasiFaseValues) => {
    updateDraft({
      locationMode: values.locationMode as LocationMode,
      areaKabupaten: values.locationMode === 'AREA_ONLY' ? values.areaKabupaten ?? '' : '',
      areaKecamatan: values.locationMode === 'AREA_ONLY' ? values.areaKecamatan ?? '' : '',
      growthStage: values.growthStage as GrowthStage,
      observedAt: values.observedAt,
    })
    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div
          className="flex items-center gap-2 rounded-2xl border border-secondary-soft bg-secondary-light px-4 py-3"
          data-testid="gps-optional-banner"
        >
          <i className="ph-fill ph-info text-h5 text-secondary-bold" aria-hidden="true" />
          <p className="text-body-md text-font-primary">GPS opsional — kasus tetap bisa dibuat.</p>
        </div>

        <section aria-label="Lokasi" className="flex flex-col gap-3">
          <h2 className="text-body-lg font-semibold text-font-primary">Di mana lokasi tanamannya?</h2>

          <button
            type="button"
            onClick={requestLocation}
            disabled={gpsStatus === 'requesting'}
            aria-pressed={locationMode === 'EXACT_GPS'}
            data-testid="location-option-gps"
            className={cn(
              OPTION_CLASSES,
              locationMode === 'EXACT_GPS'
                ? 'border-primary-base bg-primary-light'
                : 'border-border-primary bg-card hover:bg-background-secondary'
            )}
          >
            <i
              className={cn(
                'shrink-0 text-h5',
                gpsStatus === 'requesting'
                  ? 'ph ph-circle-notch animate-spin text-font-secondary'
                  : locationMode === 'EXACT_GPS'
                    ? 'ph-fill ph-check-circle text-primary-base'
                    : 'ph ph-crosshair text-font-secondary'
              )}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-body-md font-semibold text-font-primary">
                {gpsStatus === 'requesting' ? 'Meminta izin lokasi…' : 'Gunakan lokasi saya'}
              </span>
              <span className="block text-body-sm text-font-secondary">
                {locationMode === 'EXACT_GPS' && hasStoredCoords
                  ? 'Lokasi GPS tersimpan ✓'
                  : 'Izin lokasi diminta hanya saat Anda menekan tombol ini'}
              </span>
            </span>
          </button>

          {gpsNotice && (
            <Alert data-testid="gps-refused-notice" className="rounded-2xl border-info-soft bg-info-light">
              <AlertDescription className="text-body-md text-font-primary">{gpsNotice}</AlertDescription>
            </Alert>
          )}

          <button
            type="button"
            onClick={() => chooseMode('AREA_ONLY')}
            aria-pressed={locationMode === 'AREA_ONLY'}
            data-testid="location-option-area"
            className={cn(
              OPTION_CLASSES,
              locationMode === 'AREA_ONLY'
                ? 'border-primary-base bg-primary-light'
                : 'border-border-primary bg-card hover:bg-background-secondary'
            )}
          >
            <i
              className={cn(
                'shrink-0 text-h5',
                locationMode === 'AREA_ONLY'
                  ? 'ph-fill ph-check-circle text-primary-base'
                  : 'ph ph-map-pin-area text-font-secondary'
              )}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-body-md font-semibold text-font-primary">Isi area secara manual</span>
              <span className="block text-body-sm text-font-secondary">Cukup kabupaten dan kecamatan</span>
            </span>
          </button>

          {locationMode === 'AREA_ONLY' && (
            <div
              className="grid grid-cols-1 gap-4 rounded-2xl border border-border-primary bg-background-secondary p-4 sm:grid-cols-2"
              data-testid="area-manual-form"
            >
              <FormField
                control={form.control}
                name="areaKabupaten"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-md font-medium text-font-primary">Kabupaten</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Karawang" className={INPUT_CLASSES} {...field} />
                    </FormControl>
                    <FormMessage className="text-body-sm text-error-base" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="areaKecamatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-md font-medium text-font-primary">Kecamatan</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Rengasdengklok" className={INPUT_CLASSES} {...field} />
                    </FormControl>
                    <FormMessage className="text-body-sm text-error-base" />
                  </FormItem>
                )}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => chooseMode('NONE')}
            aria-pressed={locationMode === 'NONE'}
            data-testid="location-option-none"
            className={cn(
              OPTION_CLASSES,
              locationMode === 'NONE'
                ? 'border-primary-base bg-primary-light'
                : 'border-dashed border-border-secondary bg-card hover:bg-background-secondary'
            )}
          >
            <i
              className={cn(
                'shrink-0 text-h5',
                locationMode === 'NONE'
                  ? 'ph-fill ph-check-circle text-primary-base'
                  : 'ph ph-question text-font-secondary'
              )}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-body-md font-semibold text-font-primary">Belum tahu</span>
              <span className="block text-body-sm text-font-secondary">Lokasi bisa dilengkapi nanti</span>
            </span>
          </button>

          {form.formState.errors.locationMode && (
            <p className="text-body-sm text-error-base" role="alert">
              {form.formState.errors.locationMode.message}
            </p>
          )}
        </section>

        <section aria-label="Fase pertumbuhan" className="flex flex-col gap-3">
          <h2 className="text-body-lg font-semibold text-font-primary">Fase pertumbuhan padi saat ini?</h2>
          <Controller
            control={form.control}
            name="growthStage"
            render={({ field }) => <GrowthStagePicker value={field.value ?? ''} onChange={field.onChange} />}
          />
          {form.formState.errors.growthStage && (
            <p className="text-body-sm text-error-base" role="alert">
              {form.formState.errors.growthStage.message}
            </p>
          )}
        </section>

        <FormField
          control={form.control}
          name="observedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-label-md font-medium text-font-primary">Waktu pengamatan</FormLabel>
              <FormControl>
                <Input type="datetime-local" className={INPUT_CLASSES} data-testid="observed-at-input" {...field} />
              </FormControl>
              <FormMessage className="text-body-sm text-error-base" />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-xl text-body-lg font-semibold"
            onClick={onBack}
          >
            <i className="ph ph-arrow-left text-h6" aria-hidden="true" />
            Kembali
          </Button>
          <Button type="submit" size="lg" className="rounded-xl text-body-lg font-semibold">
            Lanjut
            <i className="ph ph-arrow-right text-h6" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </Form>
  )
}
