import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product, PaymentMethod } from '@/lib/types'

interface SaleRow {
  id: string
  date: string
  total: number
  payment_method: string
  sale_items: Array<{
    qty: number
    unit_price: number
    subtotal: number
    cost_total: number | null
  }>
}

interface TopProductItem {
  product_id: string
  product_name: string
  qty: number
  subtotal: number
}

interface PurchaseRow {
  id: string
  date: string
  total_cost: number
  supplier: { name: string } | null
}

interface ShrinkageRow {
  id: string
  date: string
  product_name: string
  qty: number
  reason: string
  estimated_value: number | null
}

function getDateString(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]!
}

export type DateRange = 'today' | '7d' | '30d' | 'custom'

interface DashboardOptions {
  range: DateRange
  from?: string
  to?: string
}

export function useDashboard(options: DashboardOptions = { range: '7d' }) {
  const today = getDateString(0)

  const rangeFrom = (() => {
    switch (options.range) {
      case 'today': return today
      case '7d': return getDateString(6)
      case '30d': return getDateString(29)
      case 'custom': return options.from ?? getDateString(6)
    }
  })()
  const rangeTo = options.range === 'custom' && options.to ? options.to : today

  // Ventas del rango con ítems
  const salesQuery = useQuery({
    queryKey: ['dashboard', 'sales', rangeFrom, rangeTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, date, total, payment_method, sale_items(qty, unit_price, subtotal, cost_total)')
        .gte('date', `${rangeFrom}T00:00:00`)
        .lte('date', `${rangeTo}T23:59:59`)
        .eq('voided', false)
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as SaleRow[]
    },
    staleTime: 30_000,
    retry: 1,
  })

  // Mermas del rango
  const shrinkageQuery = useQuery({
    queryKey: ['dashboard', 'shrinkage', rangeFrom, rangeTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shrinkage')
        .select('id, date, product_name, qty, reason, estimated_value')
        .gte('date', rangeFrom)
        .lte('date', rangeTo)
        .eq('voided', false)
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as ShrinkageRow[]
    },
    staleTime: 30_000,
    retry: 1,
  })

  // Compras del rango
  const purchasesQuery = useQuery({
    queryKey: ['dashboard', 'purchases', rangeFrom, rangeTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, date, total_cost, supplier:suppliers(name)')
        .gte('date', rangeFrom)
        .lte('date', rangeTo)
        .eq('voided', false)
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as PurchaseRow[]
    },
    staleTime: 30_000,
    retry: 1,
  })

  // Top productos del rango
  const topProductsQuery = useQuery({
    queryKey: ['dashboard', 'top_products', rangeFrom, rangeTo],
    queryFn: async () => {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id')
        .gte('date', `${rangeFrom}T00:00:00`)
        .lte('date', `${rangeTo}T23:59:59`)
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

  const isLoading =
    salesQuery.isLoading ||
    shrinkageQuery.isLoading ||
    topProductsQuery.isLoading ||
    productsQuery.isLoading ||
    purchasesQuery.isLoading

  // Todas las agregaciones memoizadas: solo se recalculan cuando cambian los datos de queries
  const stats = useMemo(() => {
    const salesData = salesQuery.data ?? []
    const shrinkageData = shrinkageQuery.data ?? []
    const purchasesData = purchasesQuery.data ?? []
    const products = productsQuery.data ?? []

    // --- KPIs hoy ---
    const todaySales = salesData.filter((s) => s.date.startsWith(today))
    const salesToday = todaySales.reduce((sum, s) => sum + Number(s.total), 0)
    const transactionsToday = todaySales.length
    let grossProfitToday = 0
    for (const sale of todaySales) {
      for (const item of sale.sale_items ?? []) {
        grossProfitToday += Number(item.subtotal) - Number(item.cost_total ?? 0)
      }
    }

    // --- KPIs rango completo ---
    const salesTotal = salesData.reduce((sum, s) => sum + Number(s.total), 0)
    const transactionsTotal = salesData.length
    let grossProfitTotal = 0
    for (const sale of salesData) {
      for (const item of sale.sale_items ?? []) {
        grossProfitTotal += Number(item.subtotal) - Number(item.cost_total ?? 0)
      }
    }

    // --- Mermas ---
    const shrinkageToday = shrinkageData
      .filter((s) => s.date === today)
      .reduce((sum, s) => sum + (s.estimated_value ? Number(s.estimated_value) : 0), 0)
    const shrinkageTotal = shrinkageData.reduce(
      (sum, s) => sum + (s.estimated_value ? Number(s.estimated_value) : 0), 0,
    )

    // --- Gráfico de barras por día ---
    const daysCount = Math.max(1, Math.ceil(
      (new Date(`${rangeTo}T12:00:00`).getTime() - new Date(`${rangeFrom}T12:00:00`).getTime()) / 86400000
    ) + 1)
    const daysList = Array.from({ length: Math.min(daysCount, 60) }, (_, i) => {
      const d = new Date(`${rangeFrom}T12:00:00`)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]!
    })
    const salesByDay: Record<string, number> = Object.fromEntries(daysList.map((d) => [d, 0]))
    for (const s of salesData) {
      const day = s.date.split('T')[0]!
      if (day in salesByDay) salesByDay[day]! += Number(s.total)
    }
    const chartData = daysList.map((d) => ({
      date: d,
      label: new Date(`${d}T12:00:00`).toLocaleDateString('es-CL', {
        weekday: daysCount <= 14 ? 'short' : undefined,
        day: 'numeric',
        month: daysCount > 14 ? 'short' : undefined,
      }),
      total: salesByDay[d] ?? 0,
    }))

    // --- Desglose por método de pago ---
    const paymentBreakdown: Partial<Record<PaymentMethod, { count: number; total: number }>> = {}
    for (const s of salesData) {
      const method = (s.payment_method as PaymentMethod) || 'cash'
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 }
      paymentBreakdown[method]!.count += 1
      paymentBreakdown[method]!.total += Number(s.total)
    }

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

    // --- Compras por proveedor ---
    const purchasesTotal = purchasesData.reduce((sum, p) => sum + Number(p.total_cost), 0)
    const purchasesBySupplier: Record<string, { count: number; total: number }> = {}
    for (const p of purchasesData) {
      const name = p.supplier?.name ?? 'Sin proveedor'
      if (!purchasesBySupplier[name]) purchasesBySupplier[name] = { count: 0, total: 0 }
      purchasesBySupplier[name]!.count += 1
      purchasesBySupplier[name]!.total += Number(p.total_cost)
    }
    const supplierBreakdown = Object.entries(purchasesBySupplier)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)

    // --- Mermas por razón ---
    const shrinkageByReason: Record<string, { count: number; total: number }> = {}
    for (const s of shrinkageData) {
      if (!shrinkageByReason[s.reason]) shrinkageByReason[s.reason] = { count: 0, total: 0 }
      shrinkageByReason[s.reason]!.count += 1
      shrinkageByReason[s.reason]!.total += s.estimated_value ? Number(s.estimated_value) : 0
    }
    const shrinkageBreakdown = Object.entries(shrinkageByReason)
      .map(([reason, data]) => ({ reason, ...data }))
      .sort((a, b) => b.total - a.total)

    // --- Alertas de stock ---
    const criticalStock = products.filter((p) => Number(p.stock) === 0)
    const lowStock = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) < Number(p.min_stock))

    return {
      salesToday, transactionsToday, grossProfitToday, shrinkageToday,
      salesTotal, transactionsTotal, grossProfitTotal, shrinkageTotal, purchasesTotal,
      chartData, topProducts, paymentBreakdown, supplierBreakdown, shrinkageBreakdown,
      criticalStock, lowStock,
    }
  }, [
    salesQuery.data, shrinkageQuery.data, purchasesQuery.data,
    productsQuery.data, topProductsQuery.data,
    rangeFrom, rangeTo, today,
  ])

  return {
    isLoading,
    ...stats,
    rangeFrom,
    rangeTo,
  }
}
