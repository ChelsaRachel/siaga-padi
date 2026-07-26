import { lazy, Suspense } from 'react'
import { Navigate, RouteObject } from 'react-router-dom'
import AppLayout from '@/components/layouts/AppLayout'
import { RouteFallback } from '@/components/common/RouteFallback'
import ComingSoonPage from '@/pages/coming-soon/ComingSoonPage'
import adminRoutes from './admin.routes'
import AuthGuard from './guards/AuthGuard'
import RoleGuard from './guards/RoleGuard'

const HomePage = lazy(() => import('@/pages/home/HomePage'))
const DampingiPetaniPage = lazy(() => import('@/pages/dampingi-petani/DampingiPetaniPage'))

/**
 * Protected app routes — everything renders inside the AppLayout shell.
 * Role-owned paths are wrapped in RoleGuard: wrong-role navigation
 * redirects to the visitor's own home (`/`), never an error page.
 * Future-sprint paths render ComingSoonPage as routes-to-be.
 */
const mainRoutes: RouteObject[] = [
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<RouteFallback />}>
            <HomePage />
          </Suspense>
        ),
      },

      // Petani (Sprint 02+)
      {
        path: 'periksa-tanaman',
        element: (
          <RoleGuard allowedRoles={['petani']}>
            <ComingSoonPage title="Periksa Tanaman" icon="camera" sprintLabel="Sprint 02" />
          </RoleGuard>
        ),
      },
      {
        path: 'riwayat',
        element: (
          <RoleGuard allowedRoles={['petani']}>
            <ComingSoonPage title="Riwayat" icon="clock-counter-clockwise" sprintLabel="Sprint 02" />
          </RoleGuard>
        ),
      },

      // Penyuluh
      {
        path: 'antrean-review',
        element: (
          <RoleGuard allowedRoles={['penyuluh']}>
            <ComingSoonPage title="Antrean Review" icon="list-checks" sprintLabel="Sprint 02" />
          </RoleGuard>
        ),
      },
      {
        path: 'dampingi-petani',
        element: (
          <RoleGuard allowedRoles={['penyuluh']}>
            <Suspense fallback={<RouteFallback />}>
              <DampingiPetaniPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: 'riwayat-wilayah',
        element: (
          <RoleGuard allowedRoles={['penyuluh']}>
            <ComingSoonPage title="Riwayat Wilayah" icon="map-trifold" sprintLabel="Sprint 02" />
          </RoleGuard>
        ),
      },

      // Domain reviewer
      {
        path: 'pengetahuan',
        element: (
          <RoleGuard allowedRoles={['domain_reviewer']}>
            <ComingSoonPage title="Pengetahuan" icon="books" sprintLabel="Sprint 02" />
          </RoleGuard>
        ),
      },

      // Admin branch (/administrator/*)
      ...adminRoutes,

      // Unknown protected paths land on the role home
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export default mainRoutes
