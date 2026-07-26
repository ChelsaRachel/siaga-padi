import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LoginForm } from '@/features/shared/auth'
import { selectIsAuthenticated, useAuthStore } from '@/stores/useAuthStore'

interface LocationState {
  from?: {
    pathname?: string
    search?: string
  }
}

/** Resolve the deep-link destination stored by AuthGuard (default: role home). */
function resolveRedirectPath(state: unknown): string {
  const from = (state as LocationState | null)?.from
  // Internal single-slash paths only: '//evil.com' is protocol-relative and
  // would navigate cross-origin.
  if (!from?.pathname || !from.pathname.startsWith('/') || from.pathname.startsWith('//')) {
    return '/'
  }
  return `${from.pathname}${from.search ?? ''}`
}

function LoginPage() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const location = useLocation()
  const navigate = useNavigate()
  const redirectPath = resolveRedirectPath(location.state)

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background-secondary px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-base text-font-on-accent shadow-lg">
            <i className="ph-fill ph-plant text-h3" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-h4 font-bold text-font-primary">Siaga Padi</h1>
            <p className="mt-1 text-body-md text-font-secondary">
              Masuk untuk memeriksa kesehatan tanaman padi Anda
            </p>
          </div>
        </div>

        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="border-b-0 pb-0">
            <h2 className="text-h6 font-semibold text-font-primary">Masuk</h2>
          </CardHeader>
          <CardContent className="pt-4">
            <LoginForm onSuccess={() => navigate(redirectPath, { replace: true })} />
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-body-sm text-font-placeholder">
          Butuh akun? Hubungi penyuluh di wilayah Anda.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
