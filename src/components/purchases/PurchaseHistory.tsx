import { useState } from 'react'
import { ChevronDown, ChevronRight, Ban, RefreshCw } from 'lucide-react'
import { usePurchaseOrders, usePurchaseItems, useVoidPurchaseOrder, fetchPurchaseItems } from '@/hooks/usePurchases'
import { usePriorCostPrices } from '@/hooks/usePriceHistory'
import { useAuthStore } from '@/store/authStore'
import { EmptyState, Button, toast } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'
import type { PurchaseItem, PurchaseOrder } from '@/lib/types'
import type { PurchaseLineData } from '@/lib/schemas'

interface Props {
  onRepeat?: (supplierId: string | null, lines: PurchaseLineData[]) => void
}

export function PurchaseHistory({ onRepeat }: Props) {
  const role = useAuthStore((s) => s.role)
  const { data: orders, isLoading } = usePurchaseOrders()
  const voidOrder = useVoidPurchaseOrder()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [repeatingId, setRepeatingId] = useState<string | null>(null)

  const { data: items } = usePurchaseItems(expandedId)

  const expandedOrder = orders?.find((o) => o.id === expandedId) ?? null
  const itemProductIds = items?.map((i) => i.product_id) ?? []
  const { data: priorCosts } = usePriorCostPrices(
    itemProductIds,
    expandedOrder?.created_at ?? null,
  )

  const handleVoid = async (orderId: string) => {
    if (!confirm('¿Anular esta orden? Se revertirá el stock.')) return
    try {
      await voidOrder.mutateAsync(orderId)
      toast.success('Orden anulada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular')
    }
  }

  const handleRepeat = async (order: PurchaseOrder & { supplier?: { name: string } | null }) => {
    setRepeatingId(order.id)
    try {
      const orderItems = await fetchPurchaseItems(order.id)
      const lines: PurchaseLineData[] = orderItems.map((item: PurchaseItem) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        qty: item.qty,
        unit: item.unit,
        cost_price: item.cost_price,
        purchase_unit: item.purchase_unit ?? undefined,
        conversion_factor: item.conversion_factor ?? undefined,
      }))
      onRepeat?.(order.supplier_id, lines)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar orden')
    } finally {
      setRepeatingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return <EmptyState message="No hay órdenes registradas" />
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const isExpanded = expandedId === order.id
        const isRepeating = repeatingId === order.id
        return (
          <div
            key={order.id}
            className={cn(
              'rounded-lg border bg-white',
              order.voided ? 'border-red-200 opacity-60' : 'border-gray-200',
            )}
          >
            <div className="flex w-full items-center gap-3 p-4">
              <button
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(order.date)}
                    </span>
                    {order.voided && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                        ANULADA
                      </span>
                    )}
                    {order.has_invoice && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        Factura {order.invoice_number}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {order.supplier?.name || 'Sin proveedor'} · {order.buyer_name}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCLP(order.total_cost)}
                </span>
              </button>

              {onRepeat && !order.voided && (
                <button
                  onClick={() => handleRepeat(order)}
                  disabled={isRepeating}
                  title="Repetir esta orden"
                  className="ml-1 flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3 w-3', isRepeating && 'animate-spin')} />
                  Repetir
                </button>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4">
                {items && items.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="pb-2">Producto</th>
                        <th className="pb-2 text-right">Cant</th>
                        <th className="pb-2 text-right">Costo/u</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-1.5">{item.product_name}</td>
                          <td className="py-1.5 text-right">
                            {item.qty} {item.purchase_unit || item.unit}
                            {item.purchase_unit && item.base_qty && item.purchase_unit !== item.unit && (
                              <span className="ml-1 text-xs text-primary-600">
                                (= {item.base_qty} {item.unit})
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-right">
                            <span>{formatCLP(item.cost_price)}</span>
                            {priorCosts && priorCosts[item.product_id] !== undefined &&
                              priorCosts[item.product_id] !== item.cost_price && (
                              <span
                                className={cn(
                                  'ml-1.5 text-xs font-medium',
                                  item.cost_price > priorCosts[item.product_id]!
                                    ? 'text-red-600'
                                    : 'text-green-600',
                                )}
                              >
                                {item.cost_price > priorCosts[item.product_id]! ? '↑' : '↓'}
                                {Math.abs(
                                  Math.round(
                                    ((item.cost_price - priorCosts[item.product_id]!) /
                                      priorCosts[item.product_id]!) *
                                      100,
                                  ),
                                )}%
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-right font-medium">{formatCLP(item.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-400">Cargando...</p>
                )}

                {order.comments && (
                  <p className="mt-2 text-xs text-gray-500">Nota: {order.comments}</p>
                )}

                {role === 'admin' && !order.voided && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleVoid(order.id)}
                      loading={voidOrder.isPending}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Anular
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
