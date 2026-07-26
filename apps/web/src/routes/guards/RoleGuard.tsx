import React from 'react'
import { Navigate } from 'react-router-dom'
import { selectRole, useAuthStore } from '@/stores/useAuthStore'
import type { SiagaRole } from '@/types/siaga-auth'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: SiagaRole[]
}

/**
 * Role-based route guard. Wrong-role navigation redirects to the user's own
 * home (`/` renders the role-switched home) — never an error page, per the
 * Sprint 01 contract (docs/api-spec.md § Roles → FE behavior).
 * Always nest inside <AuthGuard>.
 */
const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const role = useAuthStore(selectRole)

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default RoleGuard
