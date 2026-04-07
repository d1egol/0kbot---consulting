import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

/**
 * Suscripción Realtime global a tablas que necesitan invalidación automática.
 * Centralizado acá para que NO se cree un canal por cada montaje de hook (`useProducts`).
 */
function RealtimeBridge() {
  useEffect(() => {
    const channel = supabase
      .channel('global-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'location_stock' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['location_stock'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      {children}
    </QueryClientProvider>
  )
}
