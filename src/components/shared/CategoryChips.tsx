import { CATEGORIES } from '@/lib/constants'
import type { ProductCategory } from '@/lib/types'
import { cn } from '@/utils/cn'

interface Props {
  selected: ProductCategory | null
  onChange: (category: ProductCategory | null) => void
}

export function CategoryChips({ selected, onChange }: Props) {
  const options: { value: ProductCategory | null; label: string }[] = [
    { value: null, label: 'Todas' },
    ...CATEGORIES.map((c) => ({ value: c, label: c })),
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={() => onChange(opt.value)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            selected === opt.value
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
