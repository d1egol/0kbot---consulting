import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '@/mocks/server'
import { useStockTransfers, useTransferStock } from '@/hooks/useStockTransfers'
import { createTestQueryClient } from '@/test/utils'

const SUPABASE_URL = 'http://localhost:54321'

const mockTransferRow = {
  id: 't1',
  from_location_id: 'loc-a',
  to_location_id: 'loc-b',
  product_id: 'p1',
  product_name: 'Manzana',
  qty: 5,
  transferred_by: 'user-1',
  notes: null,
  created_at: '2024-01-01',
  from_location: { name: 'Bodega' },
  to_location: { name: 'Tienda' },
}

function wrapper({ children }: { children: ReactNode }) {
  const client = createTestQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useStockTransfers', () => {
  it('devuelve transfers con joins de from/to location', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/stock_transfers`, () =>
        HttpResponse.json([mockTransferRow]),
      ),
    )

    const { result } = renderHook(() => useStockTransfers(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    const t = result.current.data?.[0]
    expect(t?.from_location?.name).toBe('Bodega')
    expect(t?.to_location?.name).toBe('Tienda')
    expect(t?.qty).toBe(5)
  })

  it('useTransferStock invoca el RPC transfer_stock', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/rpc/transfer_stock`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json('new-transfer-id')
      }),
    )

    const { result } = renderHook(() => useTransferStock(), { wrapper })
    const id = await result.current.mutateAsync({
      from_location_id: 'loc-a',
      to_location_id: 'loc-b',
      product_id: 'p1',
      qty: 5,
      transferred_by: 'user-1',
    })

    expect(id).toBe('new-transfer-id')
    expect(receivedBody).toEqual({
      transfer_data: {
        from_location_id: 'loc-a',
        to_location_id: 'loc-b',
        product_id: 'p1',
        qty: 5,
        transferred_by: 'user-1',
      },
    })
  })
})
