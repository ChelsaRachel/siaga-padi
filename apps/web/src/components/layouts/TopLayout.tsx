import { Link, Outlet } from 'react-router-dom'
import { UserDropdown } from './UserDropdown'

function TopLayout() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <header className="border-border-soft flex h-14 shrink-0 items-center justify-between border-b px-4">
        {/* Left: app icon + back link */}
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white shrink-0">
            <i className="ph ph-shield-chevron text-sm" />
          </div>
          <div className="h-5 w-px bg-border-soft" />
          <Link
            to="/"
            className="text-font-secondary hover:text-font-primary flex items-center gap-2  transition-colors"
          >
            <i className="ph ph-arrow-left text-base" />
            Back
          </Link>
        </div>

        {/* Right: user dropdown */}
        <UserDropdown side="bottom" align="end" />
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default TopLayout
