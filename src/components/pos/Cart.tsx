import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { Button, EmptyState } from '@/components/shared'
import { formatCLP } from '@/utils/currency'

interface Props {
  onCheckout: () => void
}

export function Cart({ onCheckout }: Props) {
  const items = useCartStore((s) => s.items)
  const updateQty = useCartStore((s) => s.updateQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const discountType = useCartStore((s) => s.discountType)
  const discountValue = useCartStore((s) => s.discountValue)
  const setDiscount = useCartStore((s) => s.setDiscount)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getDiscountAmount = useCartStore((s) => s.getDiscountAmount)
  const getTotal = useCartStore((s) => s.getTotal)

  const subtotal = getSubtotal()
  const discountAmount = getDiscountAmount()
  const total = getTotal()

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <ShoppingCart className="h-4 w-4" />
          Carrito ({items.length})
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="p-4">
          <EmptyState message="Carrito vacío" />
        </div>
      ) : (
        <>
          <div className="max-h-[40vh] overflow-y-auto p-4">
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatCLP(item.product.sale_price)} / {item.product.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.product.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="w-20 text-right text-sm font-medium text-gray-900">
                    {formatCLP(item.quantity * item.product.sale_price)}
                  </span>

                  <button
                    onClick={() => {
                      if (confirm(`¿Quitar ${item.product.name} del carrito?`)) {
                        removeItem(item.product.id)
                      }
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 p-4">
            {/* Descuento */}
            <div className="mb-3 flex items-center gap-2">
              <label className="text-xs text-gray-500">Descuento</label>
              <div className="flex rounded-lg border border-gray-200">
                <button
                  onClick={() => setDiscount('percent', discountValue)}
                  className={`px-2 py-1 text-xs ${discountType === 'percent' ? 'bg-primary-100 text-primary-700' : 'text-gray-500'}`}
                >
                  %
                </button>
                <button
                  onClick={() => setDiscount('fixed', discountValue)}
                  className={`px-2 py-1 text-xs ${discountType === 'fixed' ? 'bg-primary-100 text-primary-700' : 'text-gray-500'}`}
                >
                  $
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={discountValue || ''}
                onChange={(e) => setDiscount(discountType, parseFloat(e.target.value) || 0)}
                className="h-8 w-20 rounded border border-gray-200 text-center text-sm"
                placeholder="0"
              />
            </div>

            {/* Totales */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCLP(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento</span>
                  <span>-{formatCLP(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2 text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCLP(total)}</span>
              </div>
            </div>

            <Button onClick={onCheckout} className="mt-4 w-full" size="lg">
              Cobrar {formatCLP(total)}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
