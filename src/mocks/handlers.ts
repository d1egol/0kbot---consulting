import { http, HttpResponse } from 'msw'

const SUPABASE_URL = 'http://localhost:54321'

export const handlers = [
  // Mock register_purchase_order RPC
  http.post(`${SUPABASE_URL}/rest/v1/rpc/register_purchase_order`, () => {
    return HttpResponse.json('mock-order-id-1234')
  }),

  // Mock purchase_orders query
  http.get(`${SUPABASE_URL}/rest/v1/purchase_orders`, () => {
    return HttpResponse.json([])
  }),

  // Mock products query
  http.get(`${SUPABASE_URL}/rest/v1/products`, () => {
    return HttpResponse.json([])
  }),
]
