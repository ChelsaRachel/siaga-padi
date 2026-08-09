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
const CaseCreatePage = lazy(() => import('@/pages/case-create/CaseCreatePage'))
const CasePhotoPage = lazy(() => import('@/pages/case-photo/CasePhotoPage'))
const CaseHistoryPage = lazy(() => import('@/pages/case-history/CaseHistoryPage'))
const CaseDetailPage = lazy(() => import('@/pages/case-detail/CaseDetailPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const KbCatalogPage = lazy(() => import('@/pages/kb-catalog/KbCatalogPage'))
const KbReviewPage = lazy(() => import('@/pages/kb-review/KbReviewPage'))
const KbChunkPreviewPage = lazy(() => import('@/pages/kb-chunk/KbChunkPreviewPage'))

/**
 * Sprint 02 case routes are shared by petani AND penyuluh: the wizard runs
 * in assisted mode ("atas nama") for penyuluh and they may view binaan case
 * history — never hard-restrict these to the petani role.
 */
const CASE_ROUTE_ROLES: Array<'petani' | 'penyuluh'> = ['petani', 'penyuluh']

/**
 * Sprint 04 knowledge base is a two-role surface: the admin curates the source
 * catalog and the domain reviewer decides the chunks. Both need the catalog and
 * the queue; the API — not the route — enforces who may write what.
 */
const KB_CURATION_ROLES: Array<'admin' | 'domain_reviewer'> = [
  'admin',
  'domain_reviewer',
]

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

      // Case management (Sprint 02) — petani & penyuluh (assisted mode)
      {
        path: 'periksa-tanaman',
        element: (
          <RoleGuard allowedRoles={CASE_ROUTE_ROLES}>
            <Suspense fallback={<RouteFallback />}>
              <CaseCreatePage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: 'riwayat',
        element: (
          <RoleGuard allowedRoles={CASE_ROUTE_ROLES}>
            <Suspense fallback={<RouteFallback />}>
              <CaseHistoryPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: 'profil',
        element: (
          <RoleGuard allowedRoles={CASE_ROUTE_ROLES}>
            <Suspense fallback={<RouteFallback />}>
              <ProfilePage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: 'kasus/:caseId',
        element: (
          <RoleGuard allowedRoles={CASE_ROUTE_ROLES}>
            <Suspense fallback={<RouteFallback />}>
              <CaseDetailPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        // Sprint 03 photo flow: guided camera → quality gate → retake/escalate.
        path: 'kasus/:caseId/foto',
        element: (
          <RoleGuard allowedRoles={CASE_ROUTE_ROLES}>
            <Suspense fallback={<RouteFallback />}>
              <CasePhotoPage />
            </Suspense>
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

      // Knowledge base (Sprint 04) — admin curates, domain reviewer decides
      {
        path: 'pengetahuan',
        element: (
          <RoleGuard allowedRoles={KB_CURATION_ROLES}>
            <Suspense fallback={<RouteFallback />}>
              <KbCatalogPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        path: 'pengetahuan/review',
        element: (
          <RoleGuard allowedRoles={KB_CURATION_ROLES}>
            <Suspense fallback={<RouteFallback />}>
              <KbReviewPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      {
        // Read-only citation target: every signed-in role may open a reference
        // a recommendation card points at (the API only resolves approved ones).
        path: 'pengetahuan/rujukan/:refCode',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <KbChunkPreviewPage />
          </Suspense>
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
