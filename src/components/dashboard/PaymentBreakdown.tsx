import { Banknote, CreditCard, ArrowRightLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PAYMENT_METHODS } from '@/lib/constants'
import type { PaymentMethod } from '@/lib/types'
import { formatCLP } from '@/utils/currency'
import { Spinner } from '@/components/shared'

const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowRightLeft,
}

const paymentLabels = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, { label: m.label, icon: PAYMENT_ICONS[m.value] }]),
) as Record<PaymentMethod, { label: string; icon: LucideIcon }>

interface Props {
  isLoading: boolean
  paymentBreakdown: Partial<Record<PaymentMethod, { count: number; total: number }>>
  salesTotal: number
}

export function PaymentBreakdown({ isLoading, paymentBreakdown, salesTotal }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Ventas por método de pago</h2>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : Object.keys(paymentBreakdown).length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Sin ventas en el período</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(paymentBreakdown).map(([method, data]) => {
            if (!data) return null
            const info = paymentLabels[method as PaymentMethod] ?? { label: method, icon: Banknote }
            const Icon = info.icon
            const pct = salesTotal > 0 ? Math.round((data.total / salesTotal) * 100) : 0
            return (
              <div key={method} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                  <Icon className="h-4 w-4 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-gray-900">{info.label}</p>
                    <span className="text-sm font-semibold text-gray-700">{formatCLP(data.total)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-primary-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {pct}% · {data.count} ventas
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
