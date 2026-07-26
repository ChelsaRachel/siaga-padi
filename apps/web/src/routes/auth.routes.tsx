import React, { Suspense } from 'react'
import { RouteObject } from 'react-router-dom'
import { RouteFallback } from '@/components/common/RouteFallback'

const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))

const authRoutes: RouteObject[] = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
      // You can add register, forgot-password, etc. here
    ],
  },
]

export default authRoutes
