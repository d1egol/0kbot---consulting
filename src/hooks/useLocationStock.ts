import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LocationStockRow {
  location_id: string
  location_name: string
  product_id: string
  qty: number
  updated_at: string
}

interface RawLocationStockRow {
  location_id: string
  product_id: string
  qty: number | string
  updated_at: string
  // Supabase devuelve relación foreign key como array (incluso en relaciones 1-1)
  locations: { name: string }[] | { name: string } | null
}

function locationName(locations: RawLocationStockRow['locations']): string {
  if (!locations) return ''
  if (Array.isArray(locations)) return locations[0]?.name ?? ''
  return locations.name
}

// Stock de todos los productos para una ubicación
export function useLocationStock(locationId: string | null) {
  return useQuery({
    queryKey: ['location_stock', locationId],
    queryFn: async () => {
      if (!locationId) return [] as LocationStockRow[]
      const { data, error } = await supabase
        .from('location_stock')
        .select('location_id, product_id, qty, updated_at, locations(name)')
        .eq('location_id', locationId)
        .gt('qty', 0)
      if (error) throw error
      return (data ?? []).map((row) => ({
        location_id: row.location_id,
        location_name: locationName(row.locations as RawLocationStockRow['locations']),
        product_id: row.product_id,
        qty: Number(row.qty),
        updated_at: row.updated_at,
      })) as LocationStockRow[]
    },
    staleTime: 30_000,
    retry: 1,
    enabled: !!locationId,
  })
}

// Stock de un producto en todas las ubicaciones (para inventario expandible)
export function useProductLocationStock(productId: string | null) {
  return useQuery({
    queryKey: ['location_stock', 'product', productId],
    queryFn: async () => {
      if (!productId) return [] as LocationStockRow[]
      const { data, error } = await supabase
        .from('location_stock')
        .select('location_id, product_id, qty, updated_at, locations(name)')
        .eq('product_id', productId)
        .gt('qty', 0)
      if (error) throw error
      return (data ?? []).map((row) => ({
        location_id: row.location_id,
        location_name: locationName(row.locations as RawLocationStockRow['locations']),
        product_id: row.product_id,
        qty: Number(row.qty),
        updated_at: row.updated_at,
      })) as LocationStockRow[]
    },
    staleTime: 30_000,
    retry: 1,
    enabled: !!productId,
  })
}

// Stock de TODOS los productos en TODAS las ubicaciones (para panel global)
export function useAllLocationStock() {
  return useQuery({
    queryKey: ['location_stock', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_stock')
        .select('location_id, product_id, qty, updated_at, locations(name)')
        .gt('qty', 0)
      if (error) throw error
      return (data ?? []).map((row) => ({
        location_id: row.location_id,
        location_name: locationName(row.locations as RawLocationStockRow['locations']),
        product_id: row.product_id,
        qty: Number(row.qty),
        updated_at: row.updated_at,
      })) as LocationStockRow[]
    },
    staleTime: 30_000,
    retry: 1,
  })
}
