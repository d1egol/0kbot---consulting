import { useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useDebounce } from '@/hooks/useDebounce'
import { useCartStore } from '@/store/cartStore'
import { ProductSearch, Cart, CheckoutModal, SalesHistory } from '@/components/pos'
import { toast } from '@/components/shared'
import type { Product } from '@/lib/types'

export default function POS() {
  const [search, setSearch] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [tab, setTab] = useState<'pos' | 'history'>('pos')
  const debouncedSearch = useDebounce(search)
  const { data: products } = useProducts(null, debouncedSearch)
  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)

  const handleAddProduct = (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`${product.name}: sin stock`)
      return
    }
    const inCart = items.find((i) => i.product.id === product.id)
    if (inCart && inCart.quantity >= product.stock) {
      toast.error(`${product.name}: stock máximo alcanzado`)
      return
    }
    addItem(product)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">Punto de Venta</h1>
        <div className="flex rounded-lg bg-white p-1">
          <button
            onClick={() => setTab('pos')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'pos'
                ? 'bg-primary-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Venta
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

      {tab === 'pos' ? (
        <>
          {/* Desktop: two columns */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ProductSearch
                products={products ?? []}
                search={search}
                onSearchChange={setSearch}
                onSelect={handleAddProduct}
              />
            </div>
            <div className="lg:col-span-2">
              <Cart onCheckout={() => setShowCheckout(true)} />
            </div>
          </div>

          {/* Mobile: cart sticky top, products below */}
          <div className="lg:hidden">
            <div className="sticky top-[57px] z-30 -mx-4 max-h-[45vh] overflow-y-auto bg-primary-50 px-4 pb-2">
              <Cart onCheckout={() => setShowCheckout(true)} />
            </div>
            <div className="mt-3">
              <ProductSearch
                products={products ?? []}
                search={search}
                onSearchChange={setSearch}
                onSelect={handleAddProduct}
              />
            </div>
          </div>
        </>
      ) : (
        <SalesHistory />
      )}

      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
      />
    </div>
  )
}
