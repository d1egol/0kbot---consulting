import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useProducts } from '@/hooks/useProducts'
import { createTestQueryClient } from '@/test/utils'

const SUPABASE_URL = 'http://localhost:54321'

const mockProducts = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Manzana',
    category: 'Frutas',
    unit: 'kg',
    cost_price: 500,
    sale_price: 700,
    margin_percent: 28,
    stock: 10,
    min_stock: 2,
    active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Lechuga',
    category: 'Verduras',
    unit: 'unidad',
    cost_price: 300,
    sale_price: 500,
    margin_percent: 40,
    stock: 0,
    min_stock: 5,
    active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

function wrapper({ children }: { children: ReactNode }) {
  const client = createTestQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useProducts', () => {
  it('devuelve productos activos sin filtros', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/products`, () => HttpResponse.json(mockProducts)),
    )

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0]?.name).toBe('Manzana')
  })

  it('aplica filtro de categoría en query string', async () => {
    let capturedUrl = ''
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/products`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([mockProducts[0]])
      }),
    )

    const { result } = renderHook(() => useProducts('Frutas'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedUrl).toContain('category=eq.Frutas')
  })

  it('aplica filtro de búsqueda con ilike', async () => {
    let capturedUrl = ''
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/products`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([])
      }),
    )

    const { result } = renderHook(() => useProducts(null, 'manz'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedUrl).toContain('name=ilike.%25manz%25')
  })

  it('excluye inactivos por defecto', async () => {
    let capturedUrl = ''
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/products`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([])
      }),
    )

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedUrl).toContain('active=eq.true')
  })

  it('incluye inactivos cuando showInactive=true', async () => {
    let capturedUrl = ''
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/products`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(mockProducts)
      }),
    )

    const { result } = renderHook(() => useProducts(null, undefined, true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedUrl).not.toContain('active=eq.true')
  })
})
