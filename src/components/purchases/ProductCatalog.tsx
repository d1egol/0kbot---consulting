import { CategoryChips, SearchInput, EmptyState } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { Product } from '@/lib/types'

interface Props {
  products: Product[]
  isLoading: boolean
  category: string | null
  search: string
  onCategoryChange: (cat: string | null) => void
  onSearchChange: (s: string) => void
  onSelect: (product: Product) => void
}

export function ProductCatalog({
  products, isLoading, category, search,
  onCategoryChange, onSearchChange, onSelect,
}: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Catálogo</h2>
        <CategoryChips selected={category} onChange={onCategoryChange} />
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar producto..."
          className="mt-3"
        />
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState message="Sin resultados" />
        ) : (
          <div className="space-y-1">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-primary-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.unit}</p>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      p.stock < p.min_stock ? 'text-red-600' : 'text-gray-600',
                    )}
                  >
                    {p.stock} {p.unit}
                  </span>
                  {p.cost_price > 0 && (
                    <p className="text-xs text-gray-400">{formatCLP(p.cost_price)}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
