import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useSales, useCreateSale } from '@/hooks/useSales'
import { createTestQueryClient } from '@/test/utils'

const SUPABASE_URL = 'http://localhost:54321'

function wrapper({ children }: { children: ReactNode }) {
  const client = createTestQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useSales', () => {
  it('convierte fecha local a ISO UTC en filtro from/to', async () => {
    let capturedUrl = ''
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/sales`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([])
      }),
    )

    const { result } = renderHook(() => useSales({ from: '2024-03-15', to: '2024-03-15' }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // El navegador convierte "2024-03-15T00:00:00" local → ISO UTC
    const fromIso = new Date('2024-03-15T00:00:00').toISOString()
    const toIso = new Date('2024-03-15T23:59:59').toISOString()
    expect(capturedUrl).toContain(`date=gte.${encodeURIComponent(fromIso)}`)
    expect(capturedUrl).toContain(`date=lte.${encodeURIComponent(toIso)}`)
  })

  it('devuelve ventas sin filtros', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/sales`, () =>
        HttpResponse.json([{ id: 's1', total: 1000 }]),
      ),
    )

    const { result } = renderHook(() => useSales(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })

  it('useCreateSale invoca register_sale con sale_data', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/rpc/register_sale`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json('new-sale-id')
      }),
    )

    const { result } = renderHook(() => useCreateSale(), { wrapper })
    const id = await result.current.mutateAsync({
      cashier_name: 'Diego',
      items: [{ product_id: 'p1', product_name: 'Manzana', qty: 2, unit_price: 700 }],
      discount: 0,
      discount_type: '',
      payment_method: 'cash',
      cash_received: 1500,
      cash_change: 100,
      location_id: 'loc-1',
    })

    expect(id).toBe('new-sale-id')
    expect(receivedBody).toMatchObject({
      sale_data: { cashier_name: 'Diego', payment_method: 'cash', location_id: 'loc-1' },
    })
  })
})
