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

  const addProduct = (product: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === product.id)
      if (existing) {
        return prev.map((l) =>
          l.product_id === product.id
            ? { ...l, qty: l.qty + 1 }
            : l
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        qty: 1,
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
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Panel izquierdo: catálogo */}
          <div className="lg:col-span-2">
            <ProductCatalog
              products={products ?? []}
              isLoading={isLoading}
              category={category}
              search={search}
              onCategoryChange={(c) => setCategory(c as ProductCategory | null)}
              onSearchChange={setSearch}
              onSelect={addProduct}
            />
          </div>

          {/* Panel derecho: formulario de orden */}
          <div className="lg:col-span-3">
            <PurchaseForm
              lines={lines}
              onLinesChange={setLines}
              onClear={() => setLines([])}
            />
          </div>
        </div>
      ) : (
        <PurchaseHistory />
      )}
    </div>
  )
}
