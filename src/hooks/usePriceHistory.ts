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

// Retorna el costo previo por producto_id antes de una fecha dada
// Usado en PurchaseHistory para mostrar badge de variación de precio
export function usePriorCostPrices(
  productIds: string[],
  beforeTimestamp: string | null,
) {
  return useQuery({
    queryKey: ['price_history', 'prior', [...productIds].sort().join(','), beforeTimestamp],
    queryFn: async (): Promise<Record<string, number>> => {
      if (productIds.length === 0 || !beforeTimestamp) return {}
      const { data, error } = await supabase
        .from('price_history')
        .select('product_id, cost_price, recorded_at')
        .in('product_id', productIds)
        .lt('recorded_at', beforeTimestamp)
        .order('recorded_at', { ascending: false })
      if (error) throw error
      // Para cada producto, tomar solo el registro más reciente antes de la fecha
      const result: Record<string, number> = {}
      for (const row of (data ?? []) as Pick<PriceHistory, 'product_id' | 'cost_price' | 'recorded_at'>[]) {
        if (!(row.product_id in result)) {
          result[row.product_id] = row.cost_price
        }
      }
      return result
    },
    enabled: productIds.length > 0 && !!beforeTimestamp,
    staleTime: 60_000,
  })
}
