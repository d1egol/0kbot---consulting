import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

const PAGE_SIZE = 30

export function useShrinkageList() {
  return useInfiniteQuery({
    queryKey: ['shrinkage'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('shrinkage')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)
      if (error && error.code === 'PGRST103') return [] as ShrinkageRecord[]
      if (error) throw error
      return (data ?? []) as ShrinkageRecord[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.length * PAGE_SIZE
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
