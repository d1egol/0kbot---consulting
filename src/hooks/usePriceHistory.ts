import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PriceHistory } from '@/lib/types'

export function usePriceHistory(productId: string | null) {
  return useQuery({
    queryKey: ['price_history', productId],
    queryFn: async () => {
      if (!productId) return []
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', productId)
        .order('recorded_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as PriceHistory[]
    },
    enabled: !!productId,
  })
}
