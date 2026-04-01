import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AdjustStockInput {
  product_id: string
  new_stock: number
  reason: string
  adjusted_by: string
}

export function useAdjustStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AdjustStockInput) => {
      const { data, error } = await supabase.rpc('adjust_stock', {
        adjustment_data: input,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
