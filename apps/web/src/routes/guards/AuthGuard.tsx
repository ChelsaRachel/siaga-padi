import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, useAuthStore } from '@/stores/useAuthStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Redirects unauthenticated visitors to the login page while preserving the
 * intended destination (deep-link redirect): after a successful login the
 * user lands back on `location.state.from`.
 *
 * Note: an expired session (`isSessionExpired`) keeps `isAuthenticated` true —
 * the shell shows a draft-preserving re-login modal instead of redirecting.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page but save the current location they were trying to go to
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
