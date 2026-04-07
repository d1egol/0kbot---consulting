import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useDashboard } from '@/hooks/useDashboard'
import { createTestQueryClient } from '@/test/utils'

const SUPABASE_URL = 'http://localhost:54321'

const todayIso = new Date().toISOString().split('T')[0]!
const todayDate = `${todayIso}T10:00:00`

const mockSales = [
  {
    id: 's1',
    date: todayDate,
    total: 5000,
    payment_method: 'cash',
    sale_items: [{ qty: 2, unit_price: 1500, subtotal: 3000, cost_total: 1800 }],
  },
  {
    id: 's2',
    date: todayDate,
    total: 7000,
    payment_method: 'card',
    sale_items: [{ qty: 1, unit_price: 7000, subtotal: 7000, cost_total: 4000 }],
  },
]

const mockSaleItems = [
  { product_id: 'p1', product_name: 'Manzana', qty: 2, subtotal: 3000 },
  { product_id: 'p2', product_name: 'Plátano', qty: 1, subtotal: 7000 },
]

const mockProducts = [
  {
    id: 'p1',
    name: 'Manzana',
    stock: 0,
    min_stock: 5,
    unit: 'kg',
    active: true,
    category: 'Frutas',
    cost_price: 500,
    sale_price: 700,
    margin_percent: 28,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'p2',
    name: 'Plátano',
    stock: 2,
    min_stock: 10,
    unit: 'kg',
    active: true,
    category: 'Frutas',
    cost_price: 800,
    sale_price: 1100,
    margin_percent: 27,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'p3',
    name: 'Tomate',
    stock: 50,
    min_stock: 5,
    unit: 'kg',
    active: true,
    category: 'Verduras',
    cost_price: 600,
    sale_price: 900,
    margin_percent: 33,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

function setupHandlers() {
  server.use(
    http.get(`${SUPABASE_URL}/rest/v1/sales`, ({ request }) => {
      const url = request.url
      // top_products query selecciona solo `id`
      if (url.includes('select=id') && !url.includes('payment_method')) {
        return HttpResponse.json(mockSales.map((s) => ({ id: s.id })))
      }
      return HttpResponse.json(mockSales)
    }),
    http.get(`${SUPABASE_URL}/rest/v1/sale_items`, () => HttpResponse.json(mockSaleItems)),
    http.get(`${SUPABASE_URL}/rest/v1/shrinkage`, () => HttpResponse.json([])),
    http.get(`${SUPABASE_URL}/rest/v1/purchase_orders`, () =>
      HttpResponse.json([
        { id: 'po1', date: todayIso, total_cost: 12000, supplier: { name: 'Agro SA' } },
      ]),
    ),
    http.get(`${SUPABASE_URL}/rest/v1/products`, () => HttpResponse.json(mockProducts)),
  )
}

function wrapper({ children }: { children: ReactNode }) {
  const client = createTestQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useDashboard', () => {
  it('agrega ventas, ganancia y transacciones del día', async () => {
    setupHandlers()
    const { result } = renderHook(() => useDashboard({ range: 'today' }), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.salesToday).toBe(12000)
    expect(result.current.transactionsToday).toBe(2)
    // ganancia bruta = (3000 - 1800) + (7000 - 4000) = 4200
    expect(result.current.grossProfitToday).toBe(4200)
  })

  it('agrupa ventas por método de pago', async () => {
    setupHandlers()
    const { result } = renderHook(() => useDashboard({ range: 'today' }), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.paymentBreakdown.cash).toEqual({ count: 1, total: 5000 })
    expect(result.current.paymentBreakdown.card).toEqual({ count: 1, total: 7000 })
  })

  it('top productos ordenados por revenue desc', async () => {
    setupHandlers()
    const { result } = renderHook(() => useDashboard({ range: '7d' }), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.topProducts).toHaveLength(2)
    expect(result.current.topProducts[0]?.name).toBe('Plátano')
    expect(result.current.topProducts[0]?.revenue).toBe(7000)
  })

  it('clasifica stock crítico vs bajo', async () => {
    setupHandlers()
    const { result } = renderHook(() => useDashboard({ range: 'today' }), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Manzana stock=0 → critical; Plátano stock=2 < min=10 → low; Tomate stock=50 → ok
    expect(result.current.criticalStock.map((p) => p.name)).toEqual(['Manzana'])
    expect(result.current.lowStock.map((p) => p.name)).toEqual(['Plátano'])
  })

  it('agrupa compras por proveedor y calcula total', async () => {
    setupHandlers()
    const { result } = renderHook(() => useDashboard({ range: '7d' }), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.purchasesTotal).toBe(12000)
    expect(result.current.supplierBreakdown).toEqual([
      { name: 'Agro SA', count: 1, total: 12000 },
    ])
  })
})
