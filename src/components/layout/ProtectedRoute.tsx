import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/lib/types'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  allowedRoles: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && !allowedRoles.includes(role)) {
    // Redirigir según rol
    if (role === 'cashier') return <Navigate to="/pos" replace />
    if (role === 'buyer') return <Navigate to="/purchases" replace />
    return <Navigate to="/inventory" replace />
  }

  return <>{children}</>
}
