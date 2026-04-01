import { Ban } from 'lucide-react'
import { useShrinkageList, useVoidShrinkage } from '@/hooks/useShrinkage'
import { useAuthStore } from '@/store/authStore'
import { EmptyState, Button, toast } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

export function ShrinkageHistory() {
  const role = useAuthStore((s) => s.role)
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useShrinkageList()
  const records = data?.pages.flat()
  const voidShrinkage = useVoidShrinkage()

  const handleVoid = async (id: string) => {
    if (!confirm('¿Anular esta merma? Se restaurará el stock.')) return
    try {
      await voidShrinkage.mutateAsync(id)
      toast.success('Merma anulada, stock restaurado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular')
    }
  }

  const reasonLabels: Record<string, string> = {
    vencimiento: 'Vencimiento',
    'daño': 'Daño',
    error: 'Error',
    robo: 'Robo',
    otro: 'Otro',
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Historial de Mermas</h2>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      ) : !records || records.length === 0 ? (
        <EmptyState message="No hay mermas registradas" />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className={cn(
                'rounded-lg border p-3',
                r.voided ? 'border-red-200 opacity-50' : 'border-gray-100',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{r.product_name}</p>
                    {r.voided && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                        ANULADA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDate(r.date)} · {r.qty} {r.unit} · {reasonLabels[r.reason] || r.reason}
                  </p>
                  {r.notes && <p className="mt-1 text-xs text-gray-400">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {r.estimated_value && r.estimated_value > 0 && (
                    <span className="text-sm font-medium text-yellow-700">
                      {formatCLP(r.estimated_value)}
                    </span>
                  )}
                  {(role === 'admin' || role === 'buyer') && !r.voided && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVoid(r.id)}
                      loading={voidShrinkage.isPending}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
