import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/shared'

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
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
