import { Skeleton } from '@/components/ui/skeleton'
import { selectProfile, useAuthStore } from '@/stores/useAuthStore'
import { AdminHome } from './parts/AdminHome'
import { DomainReviewerHome } from './parts/DomainReviewerHome'
import { PenyuluhHome } from './parts/PenyuluhHome'
import { PetaniHome } from './parts/PetaniHome'

/**
 * Single home route (`/`) — renders a distinct home per role.
 * Wrong-role deep links elsewhere redirect here via RoleGuard.
 */
function HomePage() {
  const profile = useAuthStore(selectProfile)

  if (!profile) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Memuat beranda">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    )
  }

  const roleHome = {
    petani: <PetaniHome />,
    penyuluh: <PenyuluhHome />,
    admin: <AdminHome />,
    domain_reviewer: <DomainReviewerHome />,
  }[profile.role]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h4 font-bold text-font-primary">
          Selamat datang, {profile.displayName}
        </h1>
        <p className="mt-1 text-body-md text-font-secondary">
          Apa yang ingin Anda lakukan hari ini?
        </p>
      </div>
      {roleHome}
    </div>
  )
}

export default HomePage
