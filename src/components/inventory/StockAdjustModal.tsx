import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { useAdjustStock } from '@/hooks/useStockAdjustment'
import { Modal, Button, toast } from '@/components/shared'
import type { Product } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  product: Product | null
}

const REASONS = [
  'Conteo físico',
  'Corrección de error',
  'Inventario inicial',
  'Devolución a proveedor',
  'Otro',
]

export function StockAdjustModal({ open, onClose, product }: Props) {
  const user = useAuthStore((s) => s.user)
  const activeLocationId = useLocationStore((s) => s.activeLocationId)
  const adjustStock = useAdjustStock()
  const [newStock, setNewStock] = useState<number>(0)
  const [reason, setReason] = useState(REASONS[0]!)

  useEffect(() => {
    if (open && product) setNewStock(product.stock)
  }, [open, product])

  const difference = product ? newStock - product.stock : 0

  const handleSubmit = async () => {
    if (!product) return
    const adjustedBy = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario'

    try {
      await adjustStock.mutateAsync({
        product_id: product.id,
        new_stock: newStock,
        reason,
        adjusted_by: adjustedBy,
        location_id: activeLocationId,
      })
      toast.success(`Stock de ${product.name} ajustado: ${product.stock} → ${newStock} ${product.unit}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al ajustar stock')
    }
  }

  const inputClass = 'h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

  if (!product) return null

  return (
    <Modal open={open} onClose={onClose} title="Ajustar Stock">
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-900">{product.name}</p>
          <p className="text-xs text-gray-500">
            Stock actual: {product.stock} {product.unit}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nuevo stock ({product.unit})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={newStock}
            onChange={(e) => setNewStock(parseFloat(e.target.value) || 0)}
            className={inputClass}
            autoFocus
          />
          {difference !== 0 && (
            <p className={`mt-1 text-xs font-medium ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {difference > 0 ? '+' : ''}{difference.toFixed(1)} {product.unit}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Razón</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={adjustStock.isPending}
            disabled={difference === 0}
          >
            Ajustar Stock
          </Button>
        </div>
      </div>
    </Modal>
  )
}
