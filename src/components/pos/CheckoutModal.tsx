import { useState, useEffect } from 'react'
import { Banknote, CreditCard, ArrowRightLeft } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { useCreateSale } from '@/hooks/useSales'
import { useAllProducts } from '@/hooks/useProducts'
import { Modal, Button, toast } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import type { PaymentMethod } from '@/lib/types'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  onClose: () => void
}

const paymentOptions: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: ArrowRightLeft },
]

export function CheckoutModal({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const activeLocationId = useLocationStore((s) => s.activeLocationId)
  const items = useCartStore((s) => s.items)
  const discountType = useCartStore((s) => s.discountType)
  const discountValue = useCartStore((s) => s.discountValue)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getDiscountAmount = useCartStore((s) => s.getDiscountAmount)
  const getTotal = useCartStore((s) => s.getTotal)
  const clear = useCartStore((s) => s.clear)
  const createSale = useCreateSale()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState<number>(0)

  const total = getTotal()
  const change = paymentMethod === 'cash' ? Math.max(0, cashReceived - total) : 0

  useEffect(() => {
    if (open) {
      setPaymentMethod('cash')
      setCashReceived(0)
    }
  }, [open])

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const { data: freshProducts } = useAllProducts()

  const handleConfirm = async () => {
    if (!activeLocationId) {
      toast.error('Selecciona una ubicación antes de cobrar')
      return
    }
    if (total <= 0) {
      toast.error('El total debe ser mayor a $0')
      return
    }

    // Validar stock actual antes de cobrar
    if (freshProducts) {
      for (const item of items) {
        const current = freshProducts.find((p) => p.id === item.product.id)
        if (!current || !current.active) {
          toast.error(`${item.product.name}: producto no disponible`)
          return
        }
        if (current.stock < item.quantity) {
          toast.error(`${item.product.name}: stock insuficiente (disponible: ${current.stock})`)
          return
        }
      }
    }

    const cashierName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Cajero'

    try {
      await createSale.mutateAsync({
        cashier_name: cashierName,
        items: items.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          qty: i.quantity,
          unit_price: i.product.sale_price,
        })),
        discount: discountValue,
        discount_type: discountValue > 0 ? discountType : '',
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? cashReceived : null,
        cash_change: paymentMethod === 'cash' ? change : null,
        location_id: activeLocationId,
      })

      toast.success(`Venta registrada: ${formatCLP(total)}`)
      clear()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar venta')
    }
  }

  const canConfirm = !!activeLocationId && total > 0 && (paymentMethod !== 'cash' || cashReceived >= total)

  return (
    <Modal open={open} onClose={onClose} title="Confirmar Cobro" className="max-w-md">
      {!activeLocationId && (
        <div className="mb-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
          Selecciona una ubicación en el encabezado antes de cobrar
        </div>
      )}
      {/* Resumen */}
      <div className="mb-4 space-y-2">
        {items.map((item) => (
          <div key={item.product.id} className="flex justify-between text-sm">
            <span className="text-gray-600">
              {item.quantity}× {item.product.name}
            </span>
            <span className="font-medium">
              {formatCLP(item.quantity * item.product.sale_price)}
            </span>
          </div>
        ))}

        <div className="border-t border-gray-100 pt-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatCLP(getSubtotal())}</span>
          </div>
          {getDiscountAmount() > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Descuento</span>
              <span>-{formatCLP(getDiscountAmount())}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-gray-900">
            <span>Total</span>
            <span>{formatCLP(total)}</span>
          </div>
        </div>
      </div>

      {/* Método de pago */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">Método de pago</label>
        <div className="grid grid-cols-3 gap-2">
          {paymentOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPaymentMethod(opt.value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-sm font-medium transition-colors',
                'min-h-[60px]',
                paymentMethod === opt.value
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              <opt.icon className="h-5 w-5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campo efectivo */}
      {paymentMethod === 'cash' && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Monto recibido</label>
          <input
            type="number"
            step="100"
            value={cashReceived || ''}
            onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
            className="h-12 w-full rounded-lg border border-gray-200 text-center text-lg font-medium focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            autoFocus
          />
          {cashReceived >= total && (
            <div className="mt-3 rounded-lg bg-green-50 p-4 text-center">
              <p className="text-sm text-green-600">Vuelto</p>
              <p className="text-3xl font-bold text-green-700">{formatCLP(change)}</p>
            </div>
          )}
          {cashReceived > 0 && cashReceived < total && (
            <p className="mt-2 text-center text-sm text-red-600">
              Faltan {formatCLP(total - cashReceived)}
            </p>
          )}
        </div>
      )}

      <Button
        onClick={handleConfirm}
        loading={createSale.isPending}
        disabled={!canConfirm}
        className="w-full"
        size="lg"
      >
        Confirmar Cobro {formatCLP(total)}
      </Button>
    </Modal>
  )
}
