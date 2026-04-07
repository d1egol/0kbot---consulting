import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StockTransferWithLocations } from '@/lib/types'

export function useStockTransfers(limit = 50) {
  return useQuery({
    queryKey: ['stock_transfers', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          id, from_location_id, to_location_id, product_id, product_name,
          qty, transferred_by, notes, created_at,
          from_location:locations!stock_transfers_from_location_id_fkey(name),
          to_location:locations!stock_transfers_to_location_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as StockTransferWithLocations[]
    },
    staleTime: 30_000,
    retry: 1,
  })
}

interface TransferInput {
  from_location_id: string
  to_location_id: string
  product_id: string
  qty: number
  transferred_by: string
  notes?: string
}

export function useTransferStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TransferInput) => {
      const { data, error } = await supabase.rpc('transfer_stock', {
        transfer_data: input,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_transfers'] })
      qc.invalidateQueries({ queryKey: ['location_stock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
