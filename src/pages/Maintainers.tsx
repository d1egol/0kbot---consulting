import { useState } from 'react'
import { cn } from '@/utils/cn'
import { SupplierManager } from '@/components/maintainers/SupplierManager'
import { UnitManager } from '@/components/maintainers/UnitManager'
import { LocationManager } from '@/components/maintainers/LocationManager'

type Tab = 'suppliers' | 'units' | 'locations'

export default function Maintainers() {
  const [tab, setTab] = useState<Tab>('suppliers')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mantenedores</h1>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab('suppliers')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'suppliers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Proveedores
        </button>
        <button
          onClick={() => setTab('units')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'units' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Unidades
        </button>
        <button
          onClick={() => setTab('locations')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'locations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Locales
        </button>
      </div>

      {tab === 'suppliers' && <SupplierManager />}
      {tab === 'units' && <UnitManager />}
      {tab === 'locations' && <LocationManager />}
    </div>
  )
}
