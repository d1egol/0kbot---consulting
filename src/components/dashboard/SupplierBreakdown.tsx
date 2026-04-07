import { Truck } from 'lucide-react'
import { formatCLP } from '@/utils/currency'
import { Spinner } from '@/components/shared'

interface Supplier {
  name: string
  count: number
  total: number
}

interface Props {
  isLoading: boolean
  supplierBreakdown: Supplier[]
  purchasesTotal: number
}

export function SupplierBreakdown({ isLoading, supplierBreakdown, purchasesTotal }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Truck className="h-4 w-4 text-purple-500" />
        <h2 className="text-sm font-semibold text-gray-700">Compras por proveedor</h2>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : supplierBreakdown.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Sin compras en el período</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {supplierBreakdown.map((s) => (
            <div key={s.name} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-400">
                  {s.count} orden{s.count > 1 ? 'es' : ''}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-700">{formatCLP(s.total)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2.5">
            <p className="text-sm font-semibold text-gray-700">Total</p>
            <span className="text-sm font-bold text-gray-900">{formatCLP(purchasesTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
