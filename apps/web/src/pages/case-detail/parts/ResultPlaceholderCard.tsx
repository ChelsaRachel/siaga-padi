import { Button } from '@/components/ui/button'

/**
 * Slot for the Sprint 05 result cards (hasil & rekomendasi) plus the
 * "Hubungi Penyuluh" stub — disabled with honest "segera hadir" copy.
 */
export function ResultPlaceholderCard() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border-secondary bg-background-secondary px-6 py-8 text-center"
      data-testid="result-placeholder-card"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <i className="ph ph-clipboard-text text-h4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-body-lg font-semibold text-font-primary">Hasil &amp; Rekomendasi</p>
        <p className="mt-1 text-body-md text-font-secondary">
          Kartu hasil pemeriksaan hadir di Sprint 05.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled
        className="rounded-xl font-semibold"
        data-testid="contact-penyuluh-stub"
      >
        <i className="ph ph-chats-circle text-h6" aria-hidden="true" />
        Hubungi Penyuluh (segera hadir)
      </Button>
    </div>
  )
}
