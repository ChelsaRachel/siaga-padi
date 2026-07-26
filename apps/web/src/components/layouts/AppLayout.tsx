import { Outlet } from 'react-router-dom'

import { PwaStatusBanner } from '@/components/common/PwaStatusBanner'
import { PerfectScrollArea } from '@/components/wrappers/PerfectScrollArea'
import { AssistedModeBanner } from '@/features/penyuluh/assisted'
import { SessionExpiredDialog } from '@/features/shared/auth'
import AppBottomNav from './AppBottomNav'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'

/**
 * App shell — Fusion "Tani Ramah".
 *
 * Region contract (non-overlapping, all reserved via flex — no fixed
 * positioning, so header/sidebar/main can never paint over each other):
 * - Header: full-width `h-14 shrink-0` top region
 * - Banners: PWA queue + assisted "atas nama" (visible on every screen)
 * - Body row: sidebar (`w-60`, desktop only) + main (PerfectScrollArea)
 * - Bottom nav: mobile only (`md:hidden`) — one-hand navigation for petani
 */
function AppLayout() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <AppHeader />
      <PwaStatusBanner />
      <AssistedModeBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AppSidebar />
        <main className="relative min-h-0 flex-1">
          <PerfectScrollArea className="h-full max-h-full">
            <div className="mx-auto w-full max-w-screen-xl px-4 py-5 md:px-6 md:py-6 lg:px-8">
              <Outlet />
            </div>
          </PerfectScrollArea>
        </main>
      </div>
      <AppBottomNav />
      <SessionExpiredDialog />
    </div>
  )
}

export default AppLayout
