import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { SortConfig } from '@/hooks/useSortable'
import { cn } from '@/utils/cn'

interface Props {
  label: string
  sortKey: string
  sortConfig: SortConfig | null
  onSort: (key: string) => void
  className?: string
}

export function SortableHeader({ label, sortKey, sortConfig, onSort, className }: Props) {
  const isActive = sortConfig?.key === sortKey
  const direction = isActive ? sortConfig.direction : null

  return (
    <th
      className={cn(
        'cursor-pointer select-none px-4 py-3 text-xs font-medium uppercase text-gray-500 hover:text-gray-700',
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn('flex items-center gap-1', className?.includes('text-right') && 'justify-end', className?.includes('text-center') && 'justify-center')}>
        {label}
        <span className="inline-flex">
          {direction === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5 text-primary-600" />
          ) : direction === 'desc' ? (
            <ChevronDown className="h-3.5 w-3.5 text-primary-600" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
          )}
        </span>
      </div>
    </th>
  )
}
