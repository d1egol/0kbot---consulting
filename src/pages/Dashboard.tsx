import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, ShoppingCart, Scissors, AlertTriangle, Package } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCLP } from '@/utils/currency'
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

// ─── Stock Badge ──────────────────────────────────────────────────────────────

function StockAlertRow({ product, critical }: { product: Product; critical: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-xs text-gray-400">{product.category}</p>
      </div>
      <span
        className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          critical
            ? 'bg-red-100 text-red-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}
      >
        {critical ? 'Sin stock' : `${Number(product.stock).toFixed(1)} ${product.unit}`}
      </span>
    </div>
  )
}

// ─── Formateador eje Y ────────────────────────────────────────────────────────

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    isLoading,
    salesToday,
    transactionsToday,
    grossProfitToday,
    shrinkageToday,
    chartData,
    topProducts,
    criticalStock,
    lowStock,
  } = useDashboard()

  const stockAlerts = [...criticalStock, ...lowStock]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Ventas hoy"
          value={isLoading ? '—' : formatCLP(salesToday)}
          icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
          color="bg-primary-50"
        />
        <KPICard
          label="Transacciones"
          value={isLoading ? '—' : String(transactionsToday)}
          icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
          color="bg-blue-50"
        />
        <KPICard
          label="Ganancia bruta"
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

      {/* Gráfico barras últimos 7 días */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Ventas últimos 7 días</h2>
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

      {/* Fila inferior: top productos + alertas */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 5 productos */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Top 5 productos (30 días)</h2>
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
                      {/* Barra proporcional */}
                      <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className="h-1.5 rounded-full bg-primary-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
            <p className="py-6 text-center text-sm text-gray-400">Todo el stock OK ✓</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {criticalStock.length > 0 && (
                <div className="pb-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">
                    Sin stock ({criticalStock.length})
                  </p>
                  {criticalStock.map((p) => (
                    <StockAlertRow key={p.id} product={p} critical />
                  ))}
                </div>
              )}
              {lowStock.length > 0 && (
                <div className="pt-2">
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
    </div>
  )
}
