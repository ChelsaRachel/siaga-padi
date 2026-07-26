import { selectAssistedSubject, selectIsAssistedActive, useAssistedStore } from '@/stores/useAssistedStore'
import { useAssistedSession } from '../hooks/useAssistedSession'

/**
 * Persistent "atas nama" banner — rendered by the shell (AppLayout) so it is
 * visible on EVERY screen while an assisted session is active. Survives page
 * reloads via the persisted assisted store. Exit ends the session via API.
 */
export function AssistedModeBanner() {
  const isActive = useAssistedStore(selectIsAssistedActive)
  const subject = useAssistedStore(selectAssistedSubject)
  const { endSession, isEnding, error } = useAssistedSession()

  if (!isActive || !subject) {
    return null
  }

  return (
    <div
      role="status"
      data-testid="assisted-mode-banner"
      className="shrink-0 border-b border-secondary-soft bg-secondary-light px-4 py-2"
    >
      <div className="mx-auto flex w-full max-w-screen-xl flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex min-w-0 items-center gap-2 text-body-md text-font-primary">
          <i className="ph-fill ph-handshake shrink-0 text-h6 text-secondary-bold" aria-hidden="true" />
          <span className="min-w-0 truncate">
            Anda bertindak atas nama: <strong className="font-semibold">{subject.displayName}</strong>
          </span>
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-body-sm text-error-base">{error}</span>}
          <button
            type="button"
            onClick={() => void endSession()}
            disabled={isEnding}
            data-testid="assisted-mode-exit"
            className="flex min-h-9 items-center gap-1.5 rounded-lg border border-secondary-soft bg-background-primary px-3 py-1.5 text-body-sm font-semibold text-font-primary transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            {isEnding ? (
              <i className="ph ph-circle-notch animate-spin" aria-hidden="true" />
            ) : (
              <i className="ph ph-sign-out" aria-hidden="true" />
            )}
            Akhiri Mode
          </button>
        </div>
      </div>
    </div>
  )
}
