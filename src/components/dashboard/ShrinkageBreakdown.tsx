import { Scissors } from 'lucide-react'
import { SHRINKAGE_REASONS } from '@/lib/constants'
import { formatCLP } from '@/utils/currency'
import { Spinner } from '@/components/shared'

const reasonLabels: Record<string, string> = Object.fromEntries(
  SHRINKAGE_REASONS.map((r) => [r.value, r.label]),
)

interface ShrinkageRow {
  reason: string
  count: number
  total: number
}

interface Props {
  isLoading: boolean
  shrinkageBreakdown: ShrinkageRow[]
  shrinkageTotal: number
}

export function ShrinkageBreakdown({ isLoading, shrinkageBreakdown, shrinkageTotal }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Scissors className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-semibold text-gray-700">Mermas por razón</h2>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : shrinkageBreakdown.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Sin mermas en el período</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {shrinkageBreakdown.map((s) => (
            <div key={s.reason} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {reasonLabels[s.reason] ?? s.reason}
                </p>
                <p className="text-xs text-gray-400">
                  {s.count} registro{s.count > 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-sm font-semibold text-orange-600">{formatCLP(s.total)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2.5">
            <p className="text-sm font-semibold text-gray-700">Total pérdida</p>
            <span className="text-sm font-bold text-orange-700">{formatCLP(shrinkageTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
