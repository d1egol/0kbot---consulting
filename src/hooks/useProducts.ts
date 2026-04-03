import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product, ProductCategory } from '@/lib/types'
import type { ProductFormData } from '@/lib/schemas'

export function useProducts(category?: ProductCategory | null, search?: string, showInactive = false) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['products', { category, search, showInactive }],
    queryFn: async () => {
      let q = supabase
        .from('products')
        .select('*')
        .order('name')

      if (!showInactive) q = q.eq('active', true)

      if (category) q = q.eq('category', category)
      if (search) q = q.ilike('name', `%${search}%`)

      const { data, error } = await q
      if (error) throw error
      return data as Product[]
    },
  })

  // Suscripción Realtime para cambios en productos
  // Canal único por instancia para evitar error al agregar listeners a canal ya suscrito
  useEffect(() => {
    const channel = supabase
      .channel(`products-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

export function useAllProducts() {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Product[]
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProductFormData & { stock?: number }) => {
      const { data: result, error } = await supabase
        .from('products')
        .insert({
          name: data.name,
          category: data.category,
          unit: data.unit,
          cost_price: data.cost_price,
          sale_price: data.sale_price,
          margin_percent: data.margin_percent ?? 20,
          min_stock: data.min_stock,
          stock: data.stock ?? 0,
        })
        .select()
        .single()
      if (error) throw error
      return result as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: ProductFormData & { id: string }) => {
      const { data: result, error } = await supabase
        .from('products')
        .update({
          name: data.name,
          category: data.category,
          unit: data.unit,
          cost_price: data.cost_price,
          sale_price: data.sale_price,
          margin_percent: data.margin_percent ?? 20,
          min_stock: data.min_stock,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return result as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useToggleProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
