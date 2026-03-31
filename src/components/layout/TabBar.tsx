import { useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, Truck, Package, AlertTriangle, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/lib/types'
import { cn } from '@/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface Tab {
  path: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
}

const tabs: Tab[] = [
  { path: '/pos', label: 'Vender', icon: ShoppingCart, roles: ['cashier', 'admin'] },
  { path: '/purchases', label: 'Compras', icon: Truck, roles: ['buyer', 'admin'] },
  { path: '/inventory', label: 'Inventario', icon: Package, roles: ['admin', 'buyer'] },
  { path: '/shrinkage', label: 'Mermas', icon: AlertTriangle, roles: ['admin', 'buyer', 'cashier'] },
  { path: '/maintainers', label: 'Mantenedores', icon: Settings, roles: ['admin'] },
]

export function TabBar() {
  const role = useAuthStore((s) => s.role)
  const location = useLocation()
  const navigate = useNavigate()

  const visibleTabs = tabs.filter((t) => role && t.roles.includes(role))

  return (
    <>
      {/* Desktop: horizontal bajo header */}
      <nav className="hidden border-b border-gray-200 bg-white md:block">
        <div className="mx-auto flex max-w-7xl gap-1 px-4">
          {visibleTabs.map((tab) => {
            const isActive = location.pathname === tab.path
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Mobile: bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex">
          {visibleTabs.map((tab) => {
            const isActive = location.pathname === tab.path
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                  isActive ? 'text-primary-600' : 'text-gray-400',
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
