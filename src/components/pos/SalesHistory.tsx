import { useState } from 'react'
import { ChevronDown, ChevronRight, Ban, Banknote, CreditCard, ArrowRightLeft } from 'lucide-react'
import { useSales, useSaleItems, useVoidSale } from '@/hooks/useSales'
import { useAuthStore } from '@/store/authStore'
import { EmptyState, Button, toast, Spinner, DateRangeFilter } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import { formatDateTime, toInputDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

const paymentIcon: Record<string, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowRightLeft,
}
const paymentLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

export function SalesHistory() {
  const role = useAuthStore((s) => s.role)
  const today = toInputDate()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: sales, isLoading } = useSales({ from, to, limit: 200 })
  const { data: items } = useSaleItems(expandedId)
  const voidSale = useVoidSale()

  const handleVoid = async (saleId: string) => {
    if (!confirm('¿Anular esta venta? Se restaurará el stock.')) return
    try {
      await voidSale.mutateAsync(saleId)
      toast.success('Venta anulada')
      if (expandedId === saleId) setExpandedId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular')
    }
  }

  const totals = sales?.filter((s) => !s.voided).reduce(
    (acc, s) => ({ count: acc.count + 1, total: acc.total + s.total }),
    { count: 0, total: 0 },
  )

  return (
    <div className="space-y-3">
      <DateRangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        rightSlot={
          totals && totals.count > 0 ? (
            <span className="text-xs text-gray-500">
              {totals.count} venta{totals.count !== 1 ? 's' : ''} ·{' '}
              <span className="font-semibold text-gray-900">{formatCLP(totals.total)}</span>
            </span>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !sales || sales.length === 0 ? (
        <EmptyState message="Sin ventas en el período seleccionado" />
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => {
            const isExpanded = expandedId === sale.id
            const Icon = paymentIcon[sale.payment_method] ?? Banknote
            return (
              <div
                key={sale.id}
                className={cn(
                  'rounded-lg border bg-white',
                  sale.voided ? 'border-red-200 opacity-60' : 'border-gray-200',
                )}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDateTime(sale.date)}
                      </span>
                      {sale.voided && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                          ANULADA
                        </span>
                      )}
                      {sale.discount > 0 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                          Desc. {formatCLP(sale.discount)}
                        </span>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <Icon className="h-3 w-3" />
                      {paymentLabel[sale.payment_method] ?? sale.payment_method}
                      {' · '}
                      {sale.cashier_name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCLP(sale.total)}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4">
                    {items && items.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500">
                            <th className="pb-2">Producto</th>
                            <th className="pb-2 text-right">Cant</th>
                            <th className="pb-2 text-right">P. Venta</th>
                            <th className="pb-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1.5">{item.product_name}</td>
                              <td className="py-1.5 text-right">{item.qty}</td>
                              <td className="py-1.5 text-right">{formatCLP(item.unit_price)}</td>
                              <td className="py-1.5 text-right font-medium">{formatCLP(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {sale.discount > 0 && (
                          <tfoot>
                            <tr className="border-t border-gray-100">
                              <td colSpan={3} className="pt-2 text-right text-xs text-gray-500">Subtotal</td>
                              <td className="pt-2 text-right text-xs">{formatCLP(sale.subtotal)}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="text-right text-xs text-amber-600">
                                Descuento {sale.discount_type === 'percent' ? '%' : '$'}
                              </td>
                              <td className="text-right text-xs text-amber-600">-{formatCLP(sale.discount)}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="text-right text-xs font-semibold text-gray-700">Total</td>
                              <td className="text-right text-sm font-bold text-gray-900">{formatCLP(sale.total)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    ) : (
                      <p className="text-sm text-gray-400">Cargando...</p>
                    )}

                    {sale.payment_method === 'cash' && sale.cash_received && (
                      <p className="mt-2 text-xs text-gray-500">
                        Recibido: {formatCLP(sale.cash_received)} · Vuelto: {formatCLP(sale.cash_change ?? 0)}
                      </p>
                    )}

                    {role === 'admin' && !sale.voided && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleVoid(sale.id)}
                          loading={voidSale.isPending}
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
      )}
    </div>
  )
}
