import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { IKbSourceRegisterPayload } from '@/services/kb.service'
import type { KbAvailabilityStatus } from '@/types/siaga-kb'
import { AVAILABILITY_LABELS } from '../../kb-labels'
import {
  KB_SOURCE_FORM_STEPS,
  kbSourceSchema,
  type TKbSourceFormValues,
} from '../kb-source.schema'
import { useKbCatalogStore } from '../store/useKbCatalogStore'

interface KbSourceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const INPUT_CLASSES =
  'h-11 rounded-xl border-border-primary bg-background-primary text-body-md text-font-primary placeholder:text-font-placeholder focus-visible:ring-1 focus-visible:ring-primary-base'

const TEXTAREA_CLASSES =
  'rounded-xl border-border-primary bg-background-primary text-body-md text-font-primary'

const AVAILABILITY_OPTIONS = Object.keys(AVAILABILITY_LABELS) as KbAvailabilityStatus[]

const EMPTY_VALUES: TKbSourceFormValues = {
  title: '',
  publisher: '',
  publishedDate: '',
  editionVersion: '',
  licenseNote: '',
  category: '',
  sourceUrl: '',
  availabilityStatus: 'tersedia',
  content: '',
}

const DOCUMENT_REQUIRED_MESSAGE =
  'Tempelkan teks dokumen atau lampirkan berkas PDF/teks agar bisa dipecah.'

function toPayload(values: TKbSourceFormValues): IKbSourceRegisterPayload {
  return {
    title: values.title,
    publisher: values.publisher,
    licenseNote: values.licenseNote,
    publishedDate: values.publishedDate || undefined,
    editionVersion: values.editionVersion || undefined,
    category: values.category || undefined,
    sourceUrl: values.sourceUrl || undefined,
    availabilityStatus: values.availabilityStatus as KbAvailabilityStatus,
    content: values.content || undefined,
  }
}

/**
 * Stepped source registration (brief 06 §2.1 — form bertahap):
 * identitas → lisensi → kategori & dokumen.
 *
 * The document may arrive as pasted text (sent with the registration) or as a
 * file (uploaded to the ingest endpoint right after the source exists). Either
 * way the catalog then reports the chunk count now waiting for review.
 */
export function KbSourceFormDialog({ open, onOpenChange }: KbSourceFormDialogProps) {
  const { isSaving, error, registerSource, ingestDocument, clearError } =
    useKbCatalogStore()
  const [stepIndex, setStepIndex] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)

  const form = useForm<TKbSourceFormValues>({
    resolver: yupResolver(kbSourceSchema),
    defaultValues: EMPTY_VALUES,
    mode: 'onTouched',
  })

  useEffect(() => {
    if (open) {
      form.reset(EMPTY_VALUES)
      setStepIndex(0)
      setFile(null)
      setDocumentError(null)
      clearError()
    }
  }, [open, form, clearError])

  const step = KB_SOURCE_FORM_STEPS[stepIndex]
  const isLastStep = stepIndex === KB_SOURCE_FORM_STEPS.length - 1

  const handleNext = async () => {
    const isStepValid = await form.trigger(
      step.fields as unknown as Array<keyof TKbSourceFormValues>
    )
    if (isStepValid) {
      setStepIndex((current) => current + 1)
    }
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const hasDocument = Boolean(values.content?.trim()) || Boolean(file)
    if (!hasDocument) {
      setDocumentError(DOCUMENT_REQUIRED_MESSAGE)
      return
    }
    setDocumentError(null)
    // Pasted text rides along with the registration; a file needs the source to
    // exist first, so it is ingested in a second call.
    const payload = toPayload(values)
    await registerSource(file ? { ...payload, content: undefined } : payload)
    if (useKbCatalogStore.getState().error) {
      return
    }
    if (file) {
      const sourceId = useKbCatalogStore.getState().sources[0]?.sourceId
      if (sourceId) {
        await ingestDocument(sourceId, { file, fileName: file.name })
      }
    }
    if (!useKbCatalogStore.getState().error) {
      onOpenChange(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Daftarkan sumber pengetahuan</DialogTitle>
          <DialogDescription>
            Langkah {stepIndex + 1} dari {KB_SOURCE_FORM_STEPS.length} — {step.label}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {step.id === 'identitas' && (
              <>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Judul dokumen</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={INPUT_CLASSES}
                          placeholder="Pengendalian Penyakit Blas"
                          data-testid="kb-source-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Penerbit</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={INPUT_CLASSES}
                          placeholder="BB Padi"
                          data-testid="kb-source-publisher"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="publishedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal terbit</FormLabel>
                        <FormControl>
                          <Input {...field} className={INPUT_CLASSES} placeholder="2024" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="editionVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edisi / versi</FormLabel>
                        <FormControl>
                          <Input {...field} className={INPUT_CLASSES} placeholder="v2" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {step.id === 'lisensi' && (
              <>
                <FormField
                  control={form.control}
                  name="licenseNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lisensi / izin pakai</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          className={TEXTAREA_CLASSES}
                          placeholder="Dokumen publik pemerintah"
                          data-testid="kb-source-license"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="availabilityStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ketersediaan</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className={`${INPUT_CLASSES} w-full px-3`}
                          data-testid="kb-source-availability"
                        >
                          {AVAILABILITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {AVAILABILITY_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tautan sumber (opsional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={INPUT_CLASSES}
                          placeholder="https://…"
                          data-testid="kb-source-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {step.id === 'dokumen' && (
              <>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori (opsional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={INPUT_CLASSES}
                          placeholder="panduan penyakit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks dokumen</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={6}
                          className={TEXTAREA_CLASSES}
                          placeholder="Tempelkan isi dokumen di sini…"
                          data-testid="kb-source-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-label-md font-medium text-font-primary">
                    atau lampirkan berkas (PDF / teks)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="text-body-sm text-font-secondary"
                    data-testid="kb-source-file"
                    id="kb-source-file"
                    name="document"
                  />
                </div>
              </>
            )}

            {documentError && (
              <Alert variant="destructive" data-testid="kb-source-document-error">
                <AlertDescription>{documentError}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" data-testid="kb-source-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={stepIndex === 0 || isSaving}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              >
                Kembali
              </Button>
              {isLastStep ? (
                <Button
                  type="submit"
                  className="rounded-xl font-semibold"
                  disabled={isSaving}
                  data-testid="kb-source-submit"
                >
                  {isSaving ? 'Menyimpan…' : 'Daftarkan & pecah'}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-xl font-semibold"
                  onClick={handleNext}
                  data-testid="kb-source-next"
                >
                  Lanjut
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
