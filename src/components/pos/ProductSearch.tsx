import { useState } from 'react'
import { Minus, Plus, Check } from 'lucide-react'
import { SearchInput, StockBadge } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { Product } from '@/lib/types'

interface Props {
  products: Product[]
  search: string
  onSearchChange: (s: string) => void
  onSelect: (product: Product) => void
}

export function ProductSearch({ products, search, onSearchChange, onSelect }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectorQty, setSelectorQty] = useState(1)

  const handleSubmit = () => {
    // ENTER agrega el primer resultado
    const first = products[0]
    if (first) {
      onSelect(first)
    }
  }

  const handleToggle = (product: Product) => {
    if (product.stock <= 0) return
    if (expandedId === product.id) {
      setExpandedId(null)
      return
    }
    setSelectorQty(1)
    setExpandedId(product.id)
  }

  const handleAdd = (product: Product) => {
    // Llamar onSelect tantas veces como la cantidad (cada llamada suma 1 al carrito)
    const times = Math.max(1, Math.round(selectorQty))
    for (let i = 0; i < times; i++) {
      onSelect(product)
    }
    setExpandedId(null)
    setSelectorQty(1)
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
            {products.map((p) => {
              const isExpanded = expandedId === p.id
              return (
                <div key={p.id}>
                  <button
                    onClick={() => handleToggle(p)}
                    disabled={p.stock <= 0}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 text-left transition-colors',
                      isExpanded ? 'bg-primary-50 border-primary-200' : 'hover:bg-primary-50',
                      p.stock <= 0 && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-lg font-bold text-primary-700">
                        {p.sale_price > 0 ? formatCLP(p.sale_price) : '—'}
                      </p>
                    </div>
                    <StockBadge stock={p.stock} minStock={p.min_stock} unit={p.unit} />
                  </button>

                  {/* Selector inline de cantidad */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-200',
                      isExpanded ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0',
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                      <button
                        onClick={() => setSelectorQty(Math.max(1, selectorQty - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={selectorQty}
                        onChange={(e) => setSelectorQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-9 w-14 rounded-lg border border-gray-200 text-center text-sm font-medium focus:border-primary-300 focus:outline-none"
                      />
                      <button
                        onClick={() => setSelectorQty(Math.min(p.stock, selectorQty + 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAdd(p)}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white active:bg-primary-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Agregar
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
