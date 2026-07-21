import { useEffect } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { usePwaStore } from '@/stores/usePwaStore'
import { renderIcon } from '@/utils/icon-renderer'

function formatLastSync(timestamp: number | null): string | null {
  if (!timestamp) {
    return null
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export function PwaStatusBanner() {
  const {
    conflictCount,
    errorMessage,
    failedCount,
    initialize,
    isOnline,
    isSupported,
    isSyncing,
    lastSyncedAt,
    pendingCount,
    retryPendingDrafts,
  } = usePwaStore()

  useEffect(() => initialize(), [initialize])

  const lastSyncLabel = formatLastSync(lastSyncedAt)
  const hasProblem = !isOnline || !isSupported || failedCount > 0 || conflictCount > 0 || Boolean(errorMessage)
  const isPending = pendingCount > 0 || isSyncing

  if (!hasProblem && !isPending && !lastSyncLabel) {
    return null
  }

  let title = 'Semua draft sudah terkirim'
  let description = lastSyncLabel
    ? `Terakhir disinkronkan ${lastSyncLabel}.`
    : 'Draft tersimpan aman di perangkat ini.'
  let icon = 'check-circle'
  let variant: 'default' | 'destructive' | 'success' | 'warning' = 'success'

  if (!isSupported) {
    title = 'Penyimpanan offline tidak tersedia'
    description = 'Browser ini belum mendukung penyimpanan draft otomatis. Tetap buka halaman sampai data selesai dikirim.'
    icon = 'warning-circle'
    variant = 'destructive'
  } else if (!isOnline) {
    title = 'Anda sedang offline'
    description = pendingCount > 0
      ? `${pendingCount} draft menunggu terkirim. Anda tetap bisa menyimpan draft dan foto; analisis dimulai setelah koneksi kembali.`
      : 'Anda tetap bisa menyimpan draft dan foto. Analisis menunggu koneksi kembali.'
    icon = 'wifi-slash'
    variant = 'warning'
  } else if (conflictCount > 0) {
    title = 'Ada draft yang perlu diperiksa'
    description = `${conflictCount} draft berubah di perangkat lain. Data server dipertahankan agar tidak tertimpa.`
    icon = 'warning-octagon'
    variant = 'destructive'
  } else if (failedCount > 0 || errorMessage) {
    title = 'Draft belum berhasil dikirim'
    description = errorMessage ?? `${failedCount} draft perlu dicoba lagi.`
    icon = 'warning-circle'
    variant = 'destructive'
  } else if (isSyncing) {
    title = 'Mengirim draft'
    description = `${pendingCount} draft sedang disinkronkan. Jangan tutup aplikasi dulu.`
    icon = 'arrows-clockwise'
    variant = 'default'
  } else if (pendingCount > 0) {
    title = 'Menunggu terkirim'
    description = `${pendingCount} draft tersimpan di perangkat dan belum terkirim.`
    icon = 'clock-countdown'
    variant = 'warning'
  }

  const canRetry = isOnline && !isSyncing && failedCount + pendingCount > 0

  return (
    <section className="px-4 pt-4" aria-live="polite" aria-atomic="true">
      <Alert
        variant={variant}
        className="mx-auto flex max-w-4xl flex-col items-stretch gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center [&>svg]:static [&>svg+div]:translate-y-0 [&>svg~*]:pl-0"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {renderIcon({ icon, weight: 'duotone', className: 'mt-0.5 shrink-0 text-h4' })}
          <div className="min-w-0 flex-1">
            <AlertTitle className="text-body-md font-semibold">{title}</AlertTitle>
            <AlertDescription className="text-body-sm leading-relaxed">
              {description}
            </AlertDescription>
          </div>
        </div>
        {canRetry && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => void retryPendingDrafts()}
            className="w-full shrink-0 rounded-xl sm:w-auto"
          >
            {renderIcon({ icon: 'paper-plane-tilt', weight: 'bold' })}
            Coba kirim lagi
          </Button>
        )}
      </Alert>
    </section>
  )
}
