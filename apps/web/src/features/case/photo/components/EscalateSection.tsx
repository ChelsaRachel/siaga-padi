import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface EscalateSectionProps {
  /** FR-004: revealed only after 3 failures on a slot (server-verified). */
  isVisible: boolean
  isEscalating: boolean
  error: string | null
  onConfirm: () => void
}

/**
 * "Kirim ke Penyuluh Saja" — jalan keluar manusiawi setelah 3× gagal.
 * Copy jujur: TANPA analisis otomatis; penyuluh yang akan memeriksa.
 */
function EscalateSection({
  isVisible,
  isEscalating,
  error,
  onConfirm,
}: EscalateSectionProps) {
  if (!isVisible) {
    return null
  }

  return (
    <section
      data-testid="escalate-section"
      className="flex w-full flex-col gap-2 rounded-2xl border border-border-primary bg-background-primary p-4"
    >
      <p className="text-body-md text-font-secondary">
        Foto sulit diambil di kondisi sekarang? Tidak apa-apa — kirim saja ke
        penyuluh untuk diperiksa langsung.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            data-testid="escalate-button"
            disabled={isEscalating}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-primary bg-background-secondary px-5 py-3 text-body-md font-semibold text-font-primary transition-colors hover:bg-muted disabled:opacity-60"
          >
            <i className="ph ph-user-focus" aria-hidden="true" />
            Kirim ke Penyuluh Saja
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim ke penyuluh tanpa analisis otomatis?</AlertDialogTitle>
            <AlertDialogDescription>
              Foto akan dikirim apa adanya dan TIDAK dianalisis otomatis.
              Penyuluh akan memeriksa kasus Anda langsung. Anda tetap bisa
              memantau statusnya di Riwayat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction data-testid="escalate-confirm" onClick={onConfirm}>
              Ya, Kirim ke Penyuluh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && (
        <p className="text-body-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

export default EscalateSection
