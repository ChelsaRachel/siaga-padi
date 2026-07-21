import { Outlet } from 'react-router-dom'

function AppLayout() {
  return (
    <>
      <h1>AppLayout</h1>
      <Outlet />
    </>
  )
}

export default AppLayout
