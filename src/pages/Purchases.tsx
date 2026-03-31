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
  const [mobileTab, setMobileTab] = useState<'catalog' | 'order'>('catalog')

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

          {/* Mobile: inner tabs para catálogo y pedido */}
          <div className="lg:hidden">
            <div className="flex rounded-lg bg-white p-1">
              <button
                onClick={() => setMobileTab('catalog')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mobileTab === 'catalog'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Catálogo
              </button>
              <button
                onClick={() => setMobileTab('order')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mobileTab === 'order'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pedido
                {lines.length > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-xs">
                    {lines.length}
                  </span>
                )}
              </button>
            </div>
            <div className="mt-4">
              {mobileTab === 'catalog' ? (
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
              ) : (
                <PurchaseForm
                  lines={lines}
                  onLinesChange={setLines}
                  onClear={() => setLines([])}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <PurchaseHistory />
      )}
    </div>
  )
}
