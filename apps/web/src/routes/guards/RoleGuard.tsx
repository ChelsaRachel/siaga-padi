import React from 'react'
import { Navigate } from 'react-router-dom'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  // TODO: Implement actual role check (e.g., from zustand store)
  const user = JSON.parse(localStorage.getItem('me') || '{}')
  const userRole = user?.role || 'user'

  if (!allowedRoles.includes(userRole)) {
    // If user doesn't have the required role, redirect to unauthorized or dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default RoleGuard
