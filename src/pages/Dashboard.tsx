import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, ShoppingCart, Scissors, AlertTriangle, Package, Truck, Banknote, CreditCard, ArrowRightLeft } from 'lucide-react'
import { useDashboard, type DateRange } from '@/hooks/useDashboard'
import { formatCLP } from '@/utils/currency'
import { SHRINKAGE_REASONS } from '@/lib/constants'
import { cn } from '@/utils/cn'
import type { Product } from '@/lib/types'

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}

function KPICard({ label, value, icon, color }: KPICardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="text-sm font-bold text-primary-700">{formatCLP(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

// ─── Stock Alert Row ────────────────────────────────────────────────────────

function StockAlertRow({ product, critical }: { product: Product; critical: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-xs text-gray-400">{product.category}</p>
      </div>
      <span
        className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          critical ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
        }`}
      >
        {critical ? 'Sin stock' : `${Number(product.stock).toFixed(1)} ${product.unit}`}
      </span>
    </div>
  )
}

// ─── Eje Y ────────────────────────────────────────────────────────────────

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

// ─── Payment icon ─────────────────────────────────────────────────────────

const paymentLabels: Record<string, { label: string; icon: typeof Banknote }> = {
  cash: { label: 'Efectivo', icon: Banknote },
  card: { label: 'Tarjeta', icon: CreditCard },
  transfer: { label: 'Transferencia', icon: ArrowRightLeft },
}

const reasonLabels: Record<string, string> = Object.fromEntries(
  SHRINKAGE_REASONS.map((r) => [r.value, r.label]),
)

// ─── Date range options ──────────────────────────────────────────────────

const rangeOptions: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'custom', label: 'Rango' },
]

// ─── Dashboard ────────────────────────────────────────────────────────────────

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

  const stockAlerts = [...criticalStock, ...lowStock]
  const showRangeKPIs = range !== 'today'

  const rangeLabel = range === 'today' ? 'hoy' : range === '7d' ? 'últimos 7 días' : range === '30d' ? 'últimos 30 días' : `${rangeFrom} a ${rangeTo}`

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

      {/* KPI Cards — Hoy */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Ventas hoy"
          value={isLoading ? '—' : formatCLP(salesToday)}
          icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
          color="bg-primary-50"
        />
        <KPICard
          label="Transacciones hoy"
          value={isLoading ? '—' : String(transactionsToday)}
          icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
          color="bg-blue-50"
        />
        <KPICard
          label="Ganancia bruta hoy"
          value={isLoading ? '—' : formatCLP(grossProfitToday)}
          icon={<Package className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-50"
        />
        <KPICard
          label="Mermas hoy"
          value={isLoading ? '—' : shrinkageToday > 0 ? formatCLP(shrinkageToday) : '$0'}
          icon={<Scissors className="h-5 w-5 text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      {/* KPI Cards — Rango (si no es "hoy") */}
      {showRangeKPIs && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KPICard
            label={`Ventas ${rangeLabel}`}
            value={isLoading ? '—' : formatCLP(salesTotal)}
            icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
            color="bg-primary-50"
          />
          <KPICard
            label="Transacciones"
            value={isLoading ? '—' : String(transactionsTotal)}
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
            color="bg-blue-50"
          />
          <KPICard
            label="Ganancia bruta"
            value={isLoading ? '—' : formatCLP(grossProfitTotal)}
            icon={<Package className="h-5 w-5 text-emerald-600" />}
            color="bg-emerald-50"
          />
          <KPICard
            label="Compras"
            value={isLoading ? '—' : formatCLP(purchasesTotal)}
            icon={<Truck className="h-5 w-5 text-purple-600" />}
            color="bg-purple-50"
          />
          <KPICard
            label="Mermas"
            value={isLoading ? '—' : formatCLP(shrinkageTotal)}
            icon={<Scissors className="h-5 w-5 text-orange-600" />}
            color="bg-orange-50"
          />
        </div>
      )}

      {/* Gráfico barras */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Ventas {rangeLabel}</h2>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f0fdf4' }} />
              <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Fila: Método de pago + Top productos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Desglose por método de pago */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Ventas por método de pago</h2>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : Object.keys(paymentBreakdown).length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin ventas en el período</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(paymentBreakdown).map(([method, data]) => {
                const info = paymentLabels[method] ?? { label: method, icon: Banknote }
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
                          <div className="h-1.5 rounded-full bg-primary-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{pct}% · {data.count} ventas</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top 5 productos */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Top 5 productos</h2>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin datos aún</p>
          ) : (
            <div className="space-y-1">
              {topProducts.map((p, i) => {
                const maxRevenue = topProducts[0]?.revenue ?? 1
                const pct = Math.round((p.revenue / maxRevenue) * 100)
                return (
                  <div key={p.name} className="flex items-center gap-3 py-1.5">
                    <span className="w-4 shrink-0 text-xs font-bold text-gray-400">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between">
                        <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                        <span className="ml-2 shrink-0 text-sm font-semibold text-primary-700">
                          {formatCLP(p.revenue)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-primary-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fila: Compras por proveedor + Mermas por razón */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Compras por proveedor */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-700">Compras por proveedor</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : supplierBreakdown.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin compras en el período</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {supplierBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.count} orden{s.count > 1 ? 'es' : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{formatCLP(s.total)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2.5">
                <p className="text-sm font-semibold text-gray-700">Total</p>
                <span className="text-sm font-bold text-gray-900">{formatCLP(purchasesTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Mermas por razón */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Scissors className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-700">Mermas por razón</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : shrinkageBreakdown.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin mermas en el período</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {shrinkageBreakdown.map((s) => (
                <div key={s.reason} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{reasonLabels[s.reason] ?? s.reason}</p>
                    <p className="text-xs text-gray-400">{s.count} registro{s.count > 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">{formatCLP(s.total)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2.5">
                <p className="text-sm font-semibold text-gray-700">Total pérdida</p>
                <span className="text-sm font-bold text-orange-700">{formatCLP(shrinkageTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alertas de stock */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-gray-700">
            Alertas de stock
            {stockAlerts.length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                {stockAlerts.length}
              </span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : stockAlerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Todo el stock OK</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {criticalStock.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">
                  Sin stock ({criticalStock.length})
                </p>
                {criticalStock.map((p) => (
                  <StockAlertRow key={p.id} product={p} critical />
                ))}
              </div>
            )}
            {lowStock.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-yellow-600">
                  Bajo mínimo ({lowStock.length})
                </p>
                {lowStock.map((p) => (
                  <StockAlertRow key={p.id} product={p} critical={false} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
