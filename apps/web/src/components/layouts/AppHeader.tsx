import { useAuthStore, selectProfile } from '@/stores/useAuthStore'
import { getRoleLabel } from '@/config/siaga-roles'

/**
 * Full-width top bar — brand + identity/status region.
 * Occupies its own reserved shell region (`h-14 shrink-0`); page navigation
 * lives in AppSidebar / AppBottomNav (config-driven), not here.
 */
function AppHeader() {
  const profile = useAuthStore(selectProfile)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const assignmentAreas = profile?.assignmentAreas ?? []
  const wilayahBinaan = profile?.role === 'penyuluh' && assignmentAreas.length > 0
    ? assignmentAreas.join(', ')
    : null

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-primary bg-background-primary px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-base text-font-on-accent">
          <i className="ph-fill ph-plant text-h6" aria-hidden="true" />
        </div>
        <span className="truncate text-body-lg font-bold text-font-primary">Siaga Padi</span>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {profile && (
          <div className="flex min-w-0 flex-col items-end">
            <span className="max-w-[40vw] truncate text-body-md font-semibold leading-tight text-font-primary">
              {profile.displayName}
            </span>
            <span className="max-w-[40vw] truncate text-body-sm leading-tight text-font-secondary">
              {getRoleLabel(profile.role)}
              {wilayahBinaan && (
                <span className="hidden sm:inline"> · Wilayah binaan: {wilayahBinaan}</span>
              )}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={clearAuth}
          aria-label="Keluar"
          title="Keluar"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-font-secondary transition-colors hover:bg-muted hover:text-error-base"
        >
          <i className="ph ph-sign-out text-h6" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export default AppHeader
