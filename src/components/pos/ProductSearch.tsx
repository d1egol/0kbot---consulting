import { SearchInput } from '@/components/shared'
import { StockBadge } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import type { Product } from '@/lib/types'

interface Props {
  products: Product[]
  search: string
  onSearchChange: (s: string) => void
  onSelect: (product: Product) => void
}

export function ProductSearch({ products, search, onSearchChange, onSelect }: Props) {
  const handleSubmit = () => {
    // ENTER agrega el primer resultado
    const first = products[0]
    if (first) {
      onSelect(first)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          onSubmit={handleSubmit}
          placeholder="Buscar producto... (Enter para agregar)"
          autoFocus={false}
        />
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {search && products.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Sin resultados</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                disabled={p.stock <= 0}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-left transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-lg font-bold text-primary-700">
                    {p.sale_price > 0 ? formatCLP(p.sale_price) : '—'}
                  </p>
                </div>
                <StockBadge stock={p.stock} minStock={p.min_stock} unit={p.unit} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
