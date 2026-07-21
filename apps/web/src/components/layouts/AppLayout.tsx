import { Outlet } from 'react-router-dom'

import { PwaStatusBanner } from '@/components/common/PwaStatusBanner'

function AppLayout() {
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <PwaStatusBanner />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
