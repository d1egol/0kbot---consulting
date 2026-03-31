import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/types'

interface SaleRow {
  id: string
  date: string
  total: number
  sale_items: Array<{
    qty: number
    unit_price: number
    products: { cost_price: number } | null
  }>
}

interface TopProductItem {
  product_id: string
  product_name: string
  qty: number
  subtotal: number
}

function getDateString(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]!
}

export function useDashboard() {
  const today = getDateString(0)
  const sevenDaysAgo = getDateString(6)
  const thirtyDaysAgo = getDateString(29)

  // Ventas últimos 7 días con sus ítems (para KPIs + chart + ganancia bruta)
  const salesQuery = useQuery({
    queryKey: ['dashboard', 'sales_with_items', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, date, total, sale_items(qty, unit_price, products(cost_price))')
        .gte('date', `${sevenDaysAgo}T00:00:00`)
        .eq('voided', false)
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as SaleRow[]
    },
    staleTime: 30_000,
    retry: 1,
  })

  // Mermas de hoy
  const shrinkageQuery = useQuery({
    queryKey: ['dashboard', 'shrinkage', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shrinkage')
        .select('estimated_value')
        .gte('date', today)
        .lte('date', today)
        .eq('voided', false)
      if (error) throw error
      return (data ?? []) as { estimated_value: number | null }[]
    },
    staleTime: 30_000,
    retry: 1,
  })

  // Top 5 productos vendidos en los últimos 30 días
  const topProductsQuery = useQuery({
    queryKey: ['dashboard', 'top_products', today],
    queryFn: async () => {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id')
        .gte('date', `${thirtyDaysAgo}T00:00:00`)
        .eq('voided', false)
      if (salesError) throw salesError

      const ids = (salesData ?? []).map((s) => s.id)
      if (ids.length === 0) return [] as TopProductItem[]

      const { data, error } = await supabase
        .from('sale_items')
        .select('product_id, product_name, qty, subtotal')
        .in('sale_id', ids)
      if (error) throw error
      return (data ?? []) as TopProductItem[]
    },
    staleTime: 30_000,
    retry: 1,
  })

  // Productos activos para alertas de stock
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, min_stock, unit, active, category, cost_price, sale_price, margin_percent, created_at, updated_at')
        .eq('active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as Product[]
    },
    staleTime: 30_000,
    retry: 1,
  })

  // --- Calcular KPIs ---
  const salesData = salesQuery.data ?? []
  const todaySales = salesData.filter((s) => s.date.startsWith(today))

  const salesToday = todaySales.reduce((sum, s) => sum + Number(s.total), 0)
  const transactionsToday = todaySales.length

  // Ganancia bruta hoy: suma de (precio_venta - costo) × cantidad
  let grossProfitToday = 0
  for (const sale of todaySales) {
    for (const item of sale.sale_items ?? []) {
      const cost = item.products?.cost_price ?? 0
      grossProfitToday += Number(item.qty) * (Number(item.unit_price) - Number(cost))
    }
  }

  // Mermas hoy
  const shrinkageToday = (shrinkageQuery.data ?? []).reduce(
    (sum, s) => sum + (s.estimated_value ? Number(s.estimated_value) : 0),
    0,
  )

  // --- Gráfico barras últimos 7 días ---
  const last7Days = Array.from({ length: 7 }, (_, i) => getDateString(6 - i))

  const salesByDay: Record<string, number> = Object.fromEntries(last7Days.map((d) => [d, 0]))
  for (const s of salesData) {
    const day = s.date.split('T')[0]!
    if (day in salesByDay) salesByDay[day]! += Number(s.total)
  }

  const chartData = last7Days.map((d) => ({
    date: d,
    label: new Date(`${d}T12:00:00`).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
    }),
    total: salesByDay[d] ?? 0,
  }))

  // --- Top 5 productos ---
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const item of topProductsQuery.data ?? []) {
    if (!productMap[item.product_id]) {
      productMap[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 }
    }
    productMap[item.product_id]!.qty += Number(item.qty)
    productMap[item.product_id]!.revenue += Number(item.subtotal)
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // --- Alertas de stock ---
  const products = productsQuery.data ?? []
  const criticalStock = products.filter((p) => Number(p.stock) === 0)
  const lowStock = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) < Number(p.min_stock))

  return {
    isLoading:
      salesQuery.isLoading ||
      shrinkageQuery.isLoading ||
      topProductsQuery.isLoading ||
      productsQuery.isLoading,
    salesToday,
    transactionsToday,
    grossProfitToday,
    shrinkageToday,
    chartData,
    topProducts,
    criticalStock,
    lowStock,
  }
}
