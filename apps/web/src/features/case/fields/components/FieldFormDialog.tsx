import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAssistedStore, selectAssistedSessionId } from '@/stores/useAssistedStore'
import type { SiagaField } from '@/types/siaga-case'
import { fieldSchema, type TFieldFormValues } from '../field.schema'
import { useFieldsStore } from '../store/useFieldsStore'

interface FieldFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present = edit mode; absent = create mode. */
  field?: SiagaField | null
}

const INPUT_CLASSES =
  'h-12 rounded-xl border-border-primary bg-background-primary text-body-lg text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-base'

function toFormValues(field?: SiagaField | null): TFieldFormValues {
  return {
    name: field?.name ?? '',
    areaKabupaten: field?.areaKabupaten ?? '',
    areaKecamatan: field?.areaKecamatan ?? '',
  }
}

/** Add/edit lahan form — nama bebas 2–100 + area. No delete in MVP (contract). */
export function FieldFormDialog({ open, onOpenChange, field }: FieldFormDialogProps) {
  const { isSaving, error, createField, updateField, clearError } = useFieldsStore()
  const assistedSessionId = useAssistedStore(selectAssistedSessionId)
  const isEditMode = Boolean(field)

  const form = useForm<TFieldFormValues>({
    resolver: yupResolver(fieldSchema),
    defaultValues: toFormValues(field),
  })

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(field))
      clearError()
    }
  }, [open, field, form, clearError])

  const onSubmit = async (values: TFieldFormValues) => {
    const areaPayload = {
      ...(values.areaKabupaten ? { areaKabupaten: values.areaKabupaten } : {}),
      ...(values.areaKecamatan ? { areaKecamatan: values.areaKecamatan } : {}),
    }
    const saved = field
      ? await updateField({ fieldId: field.fieldId, name: values.name, ...areaPayload })
      : await createField({
          name: values.name,
          ...areaPayload,
          ...(assistedSessionId ? { assistedSessionId } : {}),
        })
    if (saved) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-h6 font-bold text-font-primary">
            {isEditMode ? 'Ubah Lahan' : 'Tambah Lahan'}
          </DialogTitle>
          <DialogDescription className="text-body-md text-font-secondary">
            Nama bebas, misalnya &ldquo;Sawah belakang rumah&rdquo;. Area membantu penyuluh
            memahami wilayah Anda.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            {error && (
              <Alert variant="destructive" data-testid="field-form-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
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
                name="areaKabupaten"
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
                name="areaKecamatan"
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

            <Button
              type="submit"
              size="lg"
              disabled={isSaving}
              className="w-full rounded-xl text-body-lg font-semibold"
            >
              {isSaving ? (
                <>
                  <i className="ph ph-circle-notch animate-spin text-h6" aria-hidden="true" />
                  Menyimpan…
                </>
              ) : (
                'Simpan Lahan'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
