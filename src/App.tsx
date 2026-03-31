import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import Login from '@/pages/Login'
import Inventory from '@/pages/Inventory'
import Purchases from '@/pages/Purchases'
import POS from '@/pages/POS'
import Shrinkage from '@/pages/Shrinkage'
import Maintainers from '@/pages/Maintainers'
import Dashboard from '@/pages/Dashboard'
import NotFound from '@/pages/NotFound'

function DefaultRedirect() {
  const role = useAuthStore((s) => s.role)
  if (role === 'cashier') return <Navigate to="/pos" replace />
  if (role === 'buyer') return <Navigate to="/purchases" replace />
  if (role === 'admin') return <Navigate to="/dashboard" replace />
  return <Navigate to="/inventory" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={['admin', 'buyer', 'cashier']}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultRedirect />} />

        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedRoles={['admin', 'buyer']}>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchases"
          element={
            <ProtectedRoute allowedRoles={['admin', 'buyer']}>
              <Purchases />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos"
          element={
            <ProtectedRoute allowedRoles={['admin', 'cashier']}>
              <POS />
            </ProtectedRoute>
          }
        />
        <Route
          path="shrinkage"
          element={
            <ProtectedRoute allowedRoles={['admin', 'buyer', 'cashier']}>
              <Shrinkage />
            </ProtectedRoute>
          }
        />
        <Route
          path="maintainers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Maintainers />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
