import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LogOut, Sprout } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { SyncIndicator, ToastContainer, LocationSelector } from '@/components/shared'
import { TabBar } from './TabBar'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  buyer: 'Comprador',
  cashier: 'Cajero',
}

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const signOut = useAuthStore((s) => s.signOut)
  const { pathname } = useLocation()

  useEffect(() => {
    // Reiniciar scroll al navegar (cubre iOS Safari y Android)
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="flex min-h-screen flex-col bg-primary-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-6 w-6 text-primary-600" />
            <span className="text-lg font-bold text-gray-900">Dos Huertos</span>
          </div>

          <div className="flex items-center gap-4">
            <LocationSelector />
            <SyncIndicator />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-gray-600">{displayName}</span>
              {role && (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {roleLabels[role]}
                </span>
              )}
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar (desktop: top, mobile: bottom) */}
      <TabBar />

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-6">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  )
}
