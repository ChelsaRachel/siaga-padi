import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import authRoutes from './auth.routes'
import mainRoutes from './main.routes'

const router = createBrowserRouter([...authRoutes, ...mainRoutes])

const RouteIndex = () => {
  return (
      <RouterProvider router={router} />
  )
}

export default RouteIndex
