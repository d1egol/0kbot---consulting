import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Location } from '@/lib/types'

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('active', true)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Location[]
    },
    staleTime: 60_000,
    retry: 1,
  })
}

export function useAllLocations() {
  return useQuery({
    queryKey: ['locations', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Location[]
    },
    staleTime: 60_000,
    retry: 1,
  })
}

interface LocationInput {
  name: string
  type: 'store' | 'warehouse' | 'online'
  address?: string | null
  sort_order?: number
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: LocationInput) => {
      const { data, error } = await supabase
        .from('locations')
        .insert({ ...input, active: true })
        .select()
        .single()
      if (error) throw error
      return data as Location
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<LocationInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('locations')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Location
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useToggleLocationActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('locations')
        .update({ active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}
