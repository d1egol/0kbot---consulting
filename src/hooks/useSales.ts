import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Sale, SaleItem, PaymentMethod, DiscountType } from '@/lib/types'

interface SaleInput {
  cashier_name: string
  items: {
    product_id: string
    product_name: string
    qty: number
    unit_price: number
  }[]
  discount: number
  discount_type: DiscountType | ''
  payment_method: PaymentMethod
  cash_received: number | null
  cash_change: number | null
}

const PAGE_SIZE = 30

export function useSales() {
  return useInfiniteQuery({
    queryKey: ['sales'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)
      if (error) throw error
      return data as Sale[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.length * PAGE_SIZE
    },
  })
}

export function useSaleItems(saleId: string | null) {
  return useQuery({
    queryKey: ['sale_items', saleId],
    queryFn: async () => {
      if (!saleId) return []
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId)
      if (error) throw error
      return data as SaleItem[]
    },
    enabled: !!saleId,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaleInput) => {
      const { data, error } = await supabase.rpc('register_sale', {
        sale_data: input,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useVoidSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase.rpc('void_sale', {
        p_sale_id: saleId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
