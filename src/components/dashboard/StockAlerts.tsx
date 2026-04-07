import { AlertTriangle } from 'lucide-react'
import type { Product } from '@/lib/types'
import { Spinner } from '@/components/shared'

function StockAlertRow({ product, critical }: { product: Product; critical: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-xs text-gray-400">{product.category}</p>
      </div>
      <span
        className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          critical ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
        }`}
      >
        {critical ? 'Sin stock' : `${Number(product.stock).toFixed(1)} ${product.unit}`}
      </span>
    </div>
  )
}

interface Props {
  isLoading: boolean
  criticalStock: Product[]
  lowStock: Product[]
}

export function StockAlerts({ isLoading, criticalStock, lowStock }: Props) {
  const stockAlerts = [...criticalStock, ...lowStock]
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <h2 className="text-sm font-semibold text-gray-700">
          Alertas de stock
          {stockAlerts.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
              {stockAlerts.length}
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : stockAlerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Todo el stock OK</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {criticalStock.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">
                Sin stock ({criticalStock.length})
              </p>
              {criticalStock.map((p) => (
                <StockAlertRow key={p.id} product={p} critical />
              ))}
            </div>
          )}
          {lowStock.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-yellow-600">
                Bajo mínimo ({lowStock.length})
              </p>
              {lowStock.map((p) => (
                <StockAlertRow key={p.id} product={p} critical={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
