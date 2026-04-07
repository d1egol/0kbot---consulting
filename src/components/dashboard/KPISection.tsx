import { TrendingUp, ShoppingCart, Package, Scissors, Truck } from 'lucide-react'
import { formatCLP } from '@/utils/currency'
import { KPICard } from './KPICard'

interface Props {
  isLoading: boolean
  salesToday: number
  transactionsToday: number
  grossProfitToday: number
  shrinkageToday: number
}

export function KPISectionToday({
  isLoading,
  salesToday,
  transactionsToday,
  grossProfitToday,
  shrinkageToday,
}: Props) {
  return (
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
  )
}

interface RangeProps {
  isLoading: boolean
  rangeLabel: string
  salesTotal: number
  transactionsTotal: number
  grossProfitTotal: number
  purchasesTotal: number
  shrinkageTotal: number
}

export function KPISectionRange({
  isLoading,
  rangeLabel,
  salesTotal,
  transactionsTotal,
  grossProfitTotal,
  purchasesTotal,
  shrinkageTotal,
}: RangeProps) {
  return (
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
  )
}
