import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UnitConversion } from '@/lib/types'

export function useProductConversions(productId: string | null) {
  return useQuery({
    queryKey: ['unit_conversions', productId],
    queryFn: async () => {
      if (!productId) return []
      const { data, error } = await supabase
        .from('unit_conversions')
        .select('*')
        .eq('product_id', productId)
        .order('from_unit')
      if (error) throw error
      return data as UnitConversion[]
    },
    enabled: !!productId,
  })
}

export function useCreateConversion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { product_id: string; from_unit: string; to_unit: string; factor: number }) => {
      const { data: result, error } = await supabase
        .from('unit_conversions')
        .upsert(
          {
            product_id: data.product_id,
            from_unit: data.from_unit,
            to_unit: data.to_unit,
            factor: data.factor,
          },
          { onConflict: 'product_id,from_unit' },
        )
        .select()
        .single()
      if (error) throw error
      return result as UnitConversion
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['unit_conversions', vars.product_id] })
    },
  })
}

export function useDeleteConversion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase.from('unit_conversions').delete().eq('id', id)
      if (error) throw error
      return productId
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['unit_conversions', productId] })
    },
  })
}
