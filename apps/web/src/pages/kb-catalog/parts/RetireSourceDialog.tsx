import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { useKbCatalogStore } from '@/features/knowledge/catalog'
import type { SiagaKbSource } from '@/types/siaga-kb'

interface RetireSourceDialogProps {
  /** Non-null opens the dialog for that source. */
  source: SiagaKbSource | null
  onClose: () => void
}

/**
 * Retirement confirmation. The copy states the consequence plainly because it
 * is easy to mistake this for a delete: retiring pulls the source out of the
 * ACTIVE INDEX while every chunk stays readable, so citations on old cases
 * keep resolving.
 */
export function RetireSourceDialog({ source, onClose }: RetireSourceDialogProps) {
  const { isSaving, error, retireSource, clearError } = useKbCatalogStore()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (source) {
      setReason('')
      clearError()
    }
  }, [source, clearError])

  const handleRetire = async () => {
    if (!source) {
      return
    }
    const isRetired = await retireSource(source.sourceId, reason.trim() || undefined)
    if (isRetired) {
      onClose()
    }
  }

  return (
    <Dialog open={Boolean(source)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pensiunkan sumber</DialogTitle>
          <DialogDescription>
            {source?.title} keluar dari indeks aktif. Potongannya tetap bisa dibuka
            agar rujukan pada kasus lama tidak putus.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <span className="text-label-md font-medium text-font-primary">
            Alasan (opsional, tercatat di jejak audit)
          </span>
          <Textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Edisi 2024 ditarik penerbit"
            className="rounded-xl border-border-primary bg-background-primary text-body-md"
            data-testid="kb-retire-reason"
          />
        </div>

        {error && (
          <Alert variant="destructive" data-testid="kb-retire-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="rounded-xl font-semibold"
            disabled={isSaving}
            onClick={handleRetire}
            data-testid="kb-retire-confirm"
          >
            {isSaving ? 'Memproses…' : 'Pensiunkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
