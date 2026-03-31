import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Unit } from '@/lib/types'
import type { UnitFormData } from '@/lib/schemas'

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('active', true)
        .order('sort_order')
      if (error) throw error
      return data as Unit[]
    },
  })
}

export function useAllUnits() {
  return useQuery({
    queryKey: ['units', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as Unit[]
    },
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UnitFormData) => {
      const maxSort = await supabase
        .from('units')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      const { data: result, error } = await supabase
        .from('units')
        .insert({
          name: data.name,
          abbreviation: data.abbreviation || null,
          sort_order: (maxSort.data?.sort_order ?? 0) + 1,
        })
        .select()
        .single()
      if (error) throw error
      return result as Unit
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UnitFormData & { id: string }) => {
      const { error } = await supabase
        .from('units')
        .update({
          name: data.name,
          abbreviation: data.abbreviation || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useToggleUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('units')
        .update({ active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}
