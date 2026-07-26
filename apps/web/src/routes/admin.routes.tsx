import { Navigate, Outlet, RouteObject } from 'react-router-dom'
import ComingSoonPage from '@/pages/coming-soon/ComingSoonPage'
import RoleGuard from './guards/RoleGuard'

/**
 * Admin-only branch, nested inside the AppLayout shell (see main.routes.tsx).
 * Wrong-role access redirects to the visitor's own home via RoleGuard.
 */
const adminRoutes: RouteObject[] = [
  {
    path: 'administrator',
    element: (
      <RoleGuard allowedRoles={['admin']}>
        <Outlet />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/administrator/pengguna" replace /> },
      { path: 'pengguna', element: <ComingSoonPage title="Pengguna" icon="users" /> },
      { path: 'konfigurasi', element: <ComingSoonPage title="Konfigurasi" icon="gear-six" /> },
    ],
  },
]

export default adminRoutes
