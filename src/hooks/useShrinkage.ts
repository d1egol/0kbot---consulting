import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ShrinkageRecord, ShrinkageReason } from '@/lib/types'

interface ShrinkageInput {
  product_id: string
  product_name: string
  qty: number
  unit: string
  reason: ShrinkageReason
  notes?: string
  date?: string
}

export function useShrinkageList(limit = 100) {
  return useQuery({
    queryKey: ['shrinkage', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shrinkage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as ShrinkageRecord[]
    },
  })
}

export function useCreateShrinkage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ShrinkageInput) => {
      const { data, error } = await supabase.rpc('register_shrinkage', {
        shrinkage_data: input,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrinkage'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useVoidShrinkage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shrinkageId: string) => {
      const { error } = await supabase.rpc('void_shrinkage', {
        p_shrinkage_id: shrinkageId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shrinkage'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
