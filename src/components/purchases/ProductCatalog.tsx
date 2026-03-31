import { useState } from 'react'
import { Minus, Plus, Check } from 'lucide-react'
import { CategoryChips, SearchInput, EmptyState } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { Product } from '@/lib/types'
import type { PurchaseLineData } from '@/lib/schemas'

interface Props {
  products: Product[]
  isLoading: boolean
  category: string | null
  search: string
  onCategoryChange: (cat: string | null) => void
  onSearchChange: (s: string) => void
  onSelect: (product: Product, qty: number) => void
  existingLines?: PurchaseLineData[]
  mobileFullScroll?: boolean
}

export function ProductCatalog({
  products, isLoading, category, search,
  onCategoryChange, onSearchChange, onSelect,
  existingLines = [],
  mobileFullScroll = false,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectorQty, setSelectorQty] = useState(1)

  const handleToggle = (product: Product) => {
    if (expandedId === product.id) {
      setExpandedId(null)
      return
    }
    const existing = existingLines.find((l) => l.product_id === product.id)
    setSelectorQty(existing ? existing.qty : 1)
    setExpandedId(product.id)
  }

  const handleAdd = (product: Product) => {
    onSelect(product, selectorQty)
    setExpandedId(null)
  }

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

      <div className={cn('overflow-y-auto p-2', mobileFullScroll ? 'max-h-none' : 'max-h-[60vh]')}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState message="Sin resultados" />
        ) : (
          <div className="space-y-1">
            {products.map((p) => {
              const isExpanded = expandedId === p.id
              const existingLine = existingLines.find((l) => l.product_id === p.id)

              return (
                <div key={p.id}>
                  <button
                    onClick={() => handleToggle(p)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                      isExpanded ? 'bg-primary-50' : 'hover:bg-primary-50',
                      existingLine && !isExpanded && 'bg-primary-50/50',
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.name}
                        {existingLine && !isExpanded && (
                          <span className="ml-1.5 text-xs text-primary-600">
                            ({existingLine.qty} {p.unit})
                          </span>
                        )}
                      </p>
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

                  {/* Inline quantity selector */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-200',
                      isExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0',
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                      <button
                        onClick={() => setSelectorQty(Math.max(0.5, selectorQty - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={selectorQty}
                        onChange={(e) => setSelectorQty(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                        className="h-9 w-16 rounded-lg border border-gray-200 text-center text-sm font-medium focus:border-primary-300 focus:outline-none"
                      />
                      <button
                        onClick={() => setSelectorQty(selectorQty + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-gray-500">{p.unit}</span>
                      <button
                        onClick={() => handleAdd(p)}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white active:bg-primary-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {existingLine ? 'Actualizar' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
