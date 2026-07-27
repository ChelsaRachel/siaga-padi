import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { DELETION_REQUEST_STATUS_LABELS } from '@/features/case/case-labels'
import { farmerProfileService } from '@/services/farmer-profile.service'
import type { SiagaDeletionRequest } from '@/types/siaga-case'
import { parseApiError } from '@/utils/parse-api-error'

const REASON_MAX_LENGTH = 500

/**
 * Permintaan penghapusan data — honest copy: recorded and processed per the
 * retention policy, NOT an instant wipe. Shows the latest recorded request
 * status (badge `tercatat` etc.) fetched on open.
 */
export function DeletionRequestSection() {
  const [request, setRequest] = useState<SiagaDeletionRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    let isActive = true
    const fetchLatestRequest = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await farmerProfileService.getDeletionRequest()
        if (isActive) {
          setRequest(response?.data ?? null)
        }
      } catch (fetchError: unknown) {
        if (isActive) {
          setError(parseApiError(fetchError).message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }
    fetchLatestRequest()
    return () => {
      isActive = false
    }
  }, [])

  const submitRequest = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const trimmedReason = reason.trim()
      const response = await farmerProfileService.requestDeletion(
        trimmedReason ? { reason: trimmedReason } : {}
      )
      setRequest(response?.data ?? null)
      setIsDialogOpen(false)
      setReason('')
    } catch (submitError: unknown) {
      setError(parseApiError(submitError).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="rounded-3xl border-border-primary" data-testid="deletion-request-section">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-2">
          <i className="ph ph-trash-simple text-h5 text-font-secondary" aria-hidden="true" />
          <h2 className="text-body-lg font-semibold text-font-primary">Penghapusan Data</h2>
        </div>

        <p className="text-body-md text-font-secondary">
          Anda berhak meminta penghapusan data. Permintaan akan dicatat dan diproses sesuai
          kebijakan retensi data — bukan penghapusan seketika.
        </p>

        {error && (
          <Alert variant="destructive" data-testid="deletion-request-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Skeleton className="h-11 w-full rounded-xl" data-testid="deletion-request-loading" />
        ) : request ? (
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border-primary bg-background-secondary p-3"
            data-testid="deletion-request-status"
          >
            <Badge className="rounded-lg border-secondary-soft bg-secondary-light text-label-sm font-semibold text-font-primary">
              {DELETION_REQUEST_STATUS_LABELS[request.status]}
            </Badge>
            <p className="text-body-sm text-font-secondary">
              Permintaan dicatat pada{' '}
              {new Date(request.requestedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}.
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full rounded-xl font-semibold text-error-base hover:text-error-bold"
            onClick={() => setIsDialogOpen(true)}
            data-testid="deletion-request-button"
          >
            <i className="ph ph-trash-simple text-h6" aria-hidden="true" />
            Ajukan Penghapusan Data
          </Button>
        )}

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-h6 font-bold text-font-primary">
                Ajukan penghapusan data?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-body-md text-font-secondary">
                Permintaan Anda akan dicatat dan diproses sesuai kebijakan retensi data — bukan
                penghapusan seketika. Selama diproses, akun dan data Anda masih dapat diakses.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="deletion-reason" className="text-label-md font-medium text-font-primary">
                Alasan <span className="text-body-sm font-normal text-font-secondary">(opsional)</span>
              </label>
              <Textarea
                id="deletion-reason"
                data-testid="deletion-reason-input"
                rows={3}
                maxLength={REASON_MAX_LENGTH}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ceritakan alasan Anda (tidak wajib)"
                className="rounded-xl border-border-primary bg-background-primary text-body-md text-font-primary placeholder:text-font-placeholder"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11 rounded-xl font-semibold" disabled={isSubmitting}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                className="min-h-11 rounded-xl bg-error-base font-semibold text-font-on-accent hover:bg-error-bold"
                data-testid="deletion-request-confirm"
                disabled={isSubmitting}
                onClick={(event) => {
                  event.preventDefault()
                  submitRequest()
                }}
              >
                {isSubmitting ? 'Mengirim…' : 'Ya, Ajukan Permintaan'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
