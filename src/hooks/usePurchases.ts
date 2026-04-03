import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PurchaseOrder, PurchaseItem } from '@/lib/types'

interface PurchaseOrderInput {
  supplier_id: string | null
  buyer_name: string
  date: string
  has_invoice: boolean
  invoice_number?: string
  comments?: string
  location_id: string | null
  items: {
    product_id: string
    product_name: string
    qty: number
    unit: string
    cost_price: number
    purchase_unit?: string
    conversion_factor?: number
  }[]
}

interface PurchaseOrdersFilter {
  limit?: number
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
  supplierId?: string
}

export function usePurchaseOrders({ limit = 100, from, to, supplierId }: PurchaseOrdersFilter = {}) {
  return useQuery({
    queryKey: ['purchase_orders', limit, from ?? null, to ?? null, supplierId ?? null],
    queryFn: async () => {
      let q = supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (from)       q = q.gte('date', from)
      if (to)         q = q.lte('date', to)
      if (supplierId) q = q.eq('supplier_id', supplierId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as (PurchaseOrder & { supplier: { name: string } | null })[]
    },
    staleTime: 30_000,
    retry: 1,
  })
}

export function usePurchaseItems(orderId: string | null) {
  return useQuery({
    queryKey: ['purchase_items', orderId],
    queryFn: async () => {
      if (!orderId) return []
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_order_id', orderId)
      if (error) throw error
      return data as PurchaseItem[]
    },
    enabled: !!orderId,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PurchaseOrderInput) => {
      const { data, error } = await supabase.rpc('register_purchase_order', {
        order_data: input,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['location_stock'] })
    },
  })
}

export function useVoidPurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('void_purchase_order', {
        p_order_id: orderId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export async function fetchPurchaseItems(orderId: string): Promise<PurchaseItem[]> {
  const { data, error } = await supabase
    .from('purchase_items')
    .select('*')
    .eq('purchase_order_id', orderId)
  if (error) throw error
  return data as PurchaseItem[]
}
