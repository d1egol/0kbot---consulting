import { useState } from 'react'
import { useDashboard, type DateRange } from '@/hooks/useDashboard'
import { cn } from '@/utils/cn'
import {
  KPISectionToday,
  KPISectionRange,
  SalesChart,
  PaymentBreakdown,
  TopProducts,
  SupplierBreakdown,
  ShrinkageBreakdown,
  StockAlerts,
} from '@/components/dashboard'

const rangeOptions: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'custom', label: 'Rango' },
]

export default function Dashboard() {
  const [range, setRange] = useState<DateRange>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const {
    isLoading,
    salesToday,
    transactionsToday,
    grossProfitToday,
    shrinkageToday,
    salesTotal,
    transactionsTotal,
    grossProfitTotal,
    shrinkageTotal,
    purchasesTotal,
    chartData,
    topProducts,
    paymentBreakdown,
    supplierBreakdown,
    shrinkageBreakdown,
    criticalStock,
    lowStock,
    rangeFrom,
    rangeTo,
  } = useDashboard({
    range,
    from: customFrom || undefined,
    to: customTo || undefined,
  })

  const showRangeKPIs = range !== 'today'
  const rangeLabel =
    range === 'today'
      ? 'hoy'
      : range === '7d'
        ? 'últimos 7 días'
        : range === '30d'
          ? 'últimos 30 días'
          : `${rangeFrom} a ${rangeTo}`

  return (
    <div className="space-y-6">
      {/* Header con filtro de fechas */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex rounded-lg bg-white p-1 shadow-sm">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                range === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 px-2 text-xs"
            />
            <span className="text-xs text-gray-400">a</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 px-2 text-xs"
            />
          </div>
        )}
      </div>

      <KPISectionToday
        isLoading={isLoading}
        salesToday={salesToday}
        transactionsToday={transactionsToday}
        grossProfitToday={grossProfitToday}
        shrinkageToday={shrinkageToday}
      />

      {showRangeKPIs && (
        <KPISectionRange
          isLoading={isLoading}
          rangeLabel={rangeLabel}
          salesTotal={salesTotal}
          transactionsTotal={transactionsTotal}
          grossProfitTotal={grossProfitTotal}
          purchasesTotal={purchasesTotal}
          shrinkageTotal={shrinkageTotal}
        />
      )}

      <SalesChart isLoading={isLoading} data={chartData} rangeLabel={rangeLabel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentBreakdown
          isLoading={isLoading}
          paymentBreakdown={paymentBreakdown}
          salesTotal={salesTotal}
        />
        <TopProducts isLoading={isLoading} topProducts={topProducts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SupplierBreakdown
          isLoading={isLoading}
          supplierBreakdown={supplierBreakdown}
          purchasesTotal={purchasesTotal}
        />
        <ShrinkageBreakdown
          isLoading={isLoading}
          shrinkageBreakdown={shrinkageBreakdown}
          shrinkageTotal={shrinkageTotal}
        />
      </div>

      <StockAlerts isLoading={isLoading} criticalStock={criticalStock} lowStock={lowStock} />
    </div>
  )
}
