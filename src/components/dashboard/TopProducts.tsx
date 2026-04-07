import { formatCLP } from '@/utils/currency'
import { Spinner } from '@/components/shared'

interface Product {
  name: string
  qty: number
  revenue: number
}

interface Props {
  isLoading: boolean
  topProducts: Product[]
}

export function TopProducts({ isLoading, topProducts }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Top 5 productos</h2>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : topProducts.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Sin datos aún</p>
      ) : (
        <div className="space-y-1">
          {topProducts.map((p, i) => {
            const maxRevenue = topProducts[0]?.revenue ?? 1
            const pct = Math.round((p.revenue / maxRevenue) * 100)
            return (
              <div key={p.name} className="flex items-center gap-3 py-1.5">
                <span className="w-4 shrink-0 text-xs font-bold text-gray-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                    <span className="ml-2 shrink-0 text-sm font-semibold text-primary-700">
                      {formatCLP(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-primary-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
