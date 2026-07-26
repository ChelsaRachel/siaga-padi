import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/useAuthStore'
import { LoginForm } from './LoginForm'

/**
 * Shown when a token refresh fails while the user is authenticated
 * (`isSessionExpired`). Re-login continues on the SAME page — no hard
 * redirect — and local offline drafts are never wiped.
 *
 * The dialog is intentionally non-dismissable: without a valid session every
 * API call fails, so the only ways out are re-login or explicit logout.
 */
export function SessionExpiredDialog() {
  const isSessionExpired = useAuthStore((state) => state.isSessionExpired)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const isOpen = isSessionExpired && isAuthenticated

  if (!isOpen) {
    return null
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="rounded-3xl sm:max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-h5 text-font-primary">Sesi Anda berakhir</DialogTitle>
          <DialogDescription className="text-body-md text-font-secondary">
            Masuk kembali untuk melanjutkan. Draf yang tersimpan di perangkat Anda tetap aman dan
            tidak akan hilang.
          </DialogDescription>
        </DialogHeader>

        <LoginForm submitLabel="Masuk Kembali" />

        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={clearAuth}
          className="w-full rounded-xl text-font-secondary"
        >
          Keluar dari akun ini
        </Button>
      </DialogContent>
    </Dialog>
  )
}
