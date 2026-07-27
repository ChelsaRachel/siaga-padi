import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useFieldsStore } from '@/features/case/fields'
import { selectAssistedSubject, selectIsAssistedActive, useAssistedStore } from '@/stores/useAssistedStore'
import type { SiagaField } from '@/types/siaga-case'
import { cn } from '@/utils/cn'
import { wizardLahanSchema, type TWizardLahanValues } from '../case-create.schema'
import { useCaseWizardStore } from '../store/useCaseWizardStore'
import { ConsentInfoPanel } from './ConsentInfoPanel'

interface StepLahanProps {
  onNext: () => void
}

const INPUT_CLASSES =
  'h-12 rounded-xl border-border-primary bg-background-primary text-body-lg text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-base'

/**
 * Step 1 — pilih lahan yang ada atau buat lahan baru (nama bebas 2–100 +
 * area). In assisted mode the case is created for the subject, so only the
 * new-lahan form is offered: `fields/get-all` returns the penyuluh's OWN
 * lahan, never the subject's (contract-driven limitation).
 */
export function StepLahan({ onNext }: StepLahanProps) {
  const draft = useCaseWizardStore((state) => state.draft)
  const updateDraft = useCaseWizardStore((state) => state.updateDraft)
  const { fields, isLoading, error, fetchFields } = useFieldsStore()
  const isAssisted = useAssistedStore(selectIsAssistedActive)
  const subject = useAssistedStore(selectAssistedSubject)

  const form = useForm<TWizardLahanValues>({
    resolver: yupResolver(wizardLahanSchema),
    defaultValues: {
      fieldMode: isAssisted ? 'new' : draft.fieldMode,
      fieldId: draft.fieldId ?? '',
      newFieldName: draft.newFieldName,
      newFieldKabupaten: draft.newFieldKabupaten,
      newFieldKecamatan: draft.newFieldKecamatan,
    },
  })

  const fieldMode = form.watch('fieldMode')
  const selectedFieldId = form.watch('fieldId')

  useEffect(() => {
    if (!isAssisted) {
      fetchFields()
    }
  }, [isAssisted, fetchFields])

  const selectExistingField = (field: SiagaField) => {
    form.setValue('fieldMode', 'existing', { shouldValidate: false })
    form.setValue('fieldId', field.fieldId, { shouldValidate: true })
  }

  const selectNewFieldMode = () => {
    form.setValue('fieldMode', 'new', { shouldValidate: false })
    form.setValue('fieldId', '', { shouldValidate: false })
    form.clearErrors('fieldId')
  }

  const onSubmit = (values: TWizardLahanValues) => {
    const chosenField =
      values.fieldMode === 'existing'
        ? fields.find((field) => field.fieldId === values.fieldId) ?? null
        : null
    updateDraft({
      fieldMode: values.fieldMode as 'existing' | 'new',
      fieldId: chosenField?.fieldId ?? null,
      fieldName: chosenField?.name ?? null,
      newFieldName: values.fieldMode === 'new' ? values.newFieldName ?? '' : '',
      newFieldKabupaten: values.fieldMode === 'new' ? values.newFieldKabupaten ?? '' : '',
      newFieldKecamatan: values.fieldMode === 'new' ? values.newFieldKecamatan ?? '' : '',
    })
    onNext()
  }

  return (
    <div className="flex flex-col gap-4">
      {isAssisted && subject && (
        <div
          data-testid="wizard-assisted-context"
          className="flex items-center gap-2 rounded-2xl border border-secondary-soft bg-secondary-light px-4 py-3"
        >
          <i className="ph-fill ph-handshake text-h5 text-secondary-bold" aria-hidden="true" />
          <p className="text-body-md text-font-primary">
            Kasus ini dibuat <span className="font-semibold">atas nama {subject.displayName}</span>.
          </p>
        </div>
      )}

      <ConsentInfoPanel />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {!isAssisted && (
            <section aria-label="Pilih lahan" className="flex flex-col gap-3">
              <h2 className="text-body-lg font-semibold text-font-primary">Lahan mana yang diperiksa?</h2>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="flex flex-col items-start gap-2">
                    {error}
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={fetchFields}>
                      Coba lagi
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="flex flex-col gap-2" aria-label="Memuat daftar lahan">
                  <Skeleton className="h-14 w-full rounded-2xl" />
                  <Skeleton className="h-14 w-full rounded-2xl" />
                </div>
              ) : (
                fields.map((field) => {
                  const isSelected = fieldMode === 'existing' && selectedFieldId === field.fieldId
                  return (
                    <button
                      key={field.fieldId}
                      type="button"
                      onClick={() => selectExistingField(field)}
                      aria-pressed={isSelected}
                      data-testid={`lahan-option-${field.fieldId}`}
                      className={cn(
                        'flex min-h-14 items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
                        isSelected
                          ? 'border-primary-base bg-primary-light'
                          : 'border-border-primary bg-card hover:bg-background-secondary'
                      )}
                    >
                      <i
                        className={cn(
                          'text-h5',
                          isSelected ? 'ph-fill ph-check-circle text-primary-base' : 'ph ph-plant text-font-secondary'
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-body-lg font-semibold text-font-primary">
                          {field.name}
                        </span>
                        <span className="block truncate text-body-sm text-font-secondary">
                          {[field.areaKecamatan, field.areaKabupaten].filter(Boolean).join(', ') || 'Area belum diisi'}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}

              {!isLoading && !error && fields.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border-secondary bg-background-secondary p-4 text-body-md text-font-secondary">
                  Anda belum punya lahan tersimpan. Buat lahan baru di bawah ini.
                </p>
              )}

              {form.formState.errors.fieldId && fieldMode === 'existing' && (
                <p className="text-body-sm text-error-base" role="alert">
                  {form.formState.errors.fieldId.message}
                </p>
              )}
            </section>
          )}

          <button
            type="button"
            onClick={selectNewFieldMode}
            aria-pressed={fieldMode === 'new'}
            data-testid="lahan-option-new"
            className={cn(
              'flex min-h-14 items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
              fieldMode === 'new'
                ? 'border-primary-base bg-primary-light'
                : 'border-dashed border-border-secondary bg-card hover:bg-background-secondary'
            )}
          >
            <i
              className={cn(
                'text-h5',
                fieldMode === 'new' ? 'ph-fill ph-check-circle text-primary-base' : 'ph ph-plus-circle text-font-secondary'
              )}
              aria-hidden="true"
            />
            <span className="text-body-lg font-semibold text-font-primary">
              {isAssisted ? `Buat lahan baru untuk ${subject?.displayName ?? 'petani'}` : 'Buat lahan baru'}
            </span>
          </button>

          {fieldMode === 'new' && (
            <div className="flex flex-col gap-4 rounded-2xl border border-border-primary bg-background-secondary p-4">
              <FormField
                control={form.control}
                name="newFieldName"
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel className="text-label-md font-medium text-font-primary">Nama lahan</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Sawah belakang rumah" className={INPUT_CLASSES} {...formField} />
                    </FormControl>
                    <FormMessage className="text-body-sm text-error-base" />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="newFieldKabupaten"
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel className="text-label-md font-medium text-font-primary">
                        Kabupaten <span className="text-body-sm font-normal text-font-secondary">(opsional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="cth. Karawang" className={INPUT_CLASSES} {...formField} />
                      </FormControl>
                      <FormMessage className="text-body-sm text-error-base" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newFieldKecamatan"
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel className="text-label-md font-medium text-font-primary">
                        Kecamatan <span className="text-body-sm font-normal text-font-secondary">(opsional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="cth. Rengasdengklok" className={INPUT_CLASSES} {...formField} />
                      </FormControl>
                      <FormMessage className="text-body-sm text-error-base" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full rounded-xl text-body-lg font-semibold">
            Lanjut
            <i className="ph ph-arrow-right text-h6" aria-hidden="true" />
          </Button>
        </form>
      </Form>
    </div>
  )
}
