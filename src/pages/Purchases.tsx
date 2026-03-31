import { useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { ProductCatalog } from '@/components/purchases/ProductCatalog'
import { PurchaseForm } from '@/components/purchases/PurchaseForm'
import { PurchaseHistory } from '@/components/purchases/PurchaseHistory'
import type { Product, ProductCategory } from '@/lib/types'
import type { PurchaseLineData } from '@/lib/schemas'

export default function Purchases() {
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<PurchaseLineData[]>([])
  const [tab, setTab] = useState<'order' | 'history'>('order')

  const { data: products, isLoading } = useProducts(category, search)

  const addProduct = (product: Product, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === product.id)
      if (existing) {
        return prev.map((l) =>
          l.product_id === product.id
            ? { ...l, qty }
            : l
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        qty,
        unit: product.unit,
        cost_price: product.cost_price,
      }]
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">Compras</h1>
        <div className="flex rounded-lg bg-white p-1">
          <button
            onClick={() => setTab('order')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'order'
                ? 'bg-primary-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Nueva Orden
          </button>
          <button
            onClick={() => setTab('history')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'history'
                ? 'bg-primary-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {tab === 'order' ? (
        <>
          {/* Desktop: two columns */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-5">
            <div className="lg:col-span-2">
              <ProductCatalog
                products={products ?? []}
                isLoading={isLoading}
                category={category}
                search={search}
                onCategoryChange={(c) => setCategory(c as ProductCategory | null)}
                onSearchChange={setSearch}
                onSelect={addProduct}
                existingLines={lines}
              />
            </div>
            <div className="lg:col-span-3">
              <PurchaseForm
                lines={lines}
                onLinesChange={setLines}
                onClear={() => setLines([])}
              />
            </div>
          </div>

          {/* Mobile: form sticky top, catalog below */}
          <div className="lg:hidden">
            <div className="sticky top-[57px] z-30 -mx-4 max-h-[45vh] overflow-y-auto bg-primary-50 px-4 pb-2">
              <PurchaseForm
                lines={lines}
                onLinesChange={setLines}
                onClear={() => setLines([])}
              />
            </div>
            <div className="mt-3">
              <ProductCatalog
                products={products ?? []}
                isLoading={isLoading}
                category={category}
                search={search}
                onCategoryChange={(c) => setCategory(c as ProductCategory | null)}
                onSearchChange={setSearch}
                onSelect={addProduct}
                existingLines={lines}
                mobileFullScroll
              />
            </div>
          </div>
        </>
      ) : (
        <PurchaseHistory />
      )}
    </div>
  )
}
