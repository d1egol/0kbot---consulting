import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
