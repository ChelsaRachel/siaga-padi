import { lazy, Suspense } from 'react'
import { RouteObject } from 'react-router-dom'
import AppLayout from '@/components/layouts/AppLayout'
import BlankLayout from '@/components/layouts/BlankLayout'
import TopLayout from '@/components/layouts/TopLayout'

const Dashboard = lazy(() => import('@/pages/dashboard/DashboardPage'))


const mainRoutes: RouteObject[] = [
  {
    path: '/',
    children: [
      {
        element: <BlankLayout />,
        children: [],
      },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Suspense><Dashboard /></Suspense> },
          { path: '/path', element: <Suspense><>Component here</></Suspense> },
          
        ],
      },
      {
        element: <TopLayout />,
        children: [
          { path: '/path-2', element: <Suspense><>Component here</></Suspense> },
        ],
      },
    ],
  },
]

export default mainRoutes