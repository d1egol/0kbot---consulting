import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Supplier } from '@/lib/types'
import type { SupplierFormData } from '@/lib/schemas'

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Supplier[]
    },
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const { data: result, error } = await supabase
        .from('suppliers')
        .insert({ name: data.name, phone: data.phone || null })
        .select()
        .single()
      if (error) throw error
      return result as Supplier
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}
