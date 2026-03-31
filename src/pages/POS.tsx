import { useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useCartStore } from '@/store/cartStore'
import { ProductSearch } from '@/components/pos/ProductSearch'
import { Cart } from '@/components/pos/Cart'
import { CheckoutModal } from '@/components/pos/CheckoutModal'
import { toast } from '@/components/shared'
import type { Product } from '@/lib/types'

export default function POS() {
  const [search, setSearch] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const { data: products } = useProducts(null, search)
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
      <h1 className="text-xl font-bold text-gray-900">Punto de Venta</h1>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Búsqueda de productos */}
        <div className="lg:col-span-3">
          <ProductSearch
            products={products ?? []}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleAddProduct}
          />
        </div>

        {/* Carrito */}
        <div className="lg:col-span-2">
          <Cart onCheckout={() => setShowCheckout(true)} />
        </div>
      </div>

      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
      />
    </div>
  )
}
