import { cn } from '@/utils/cn'

interface Props {
  stock: number
  minStock: number
  unit?: string
}

export function StockBadge({ stock, minStock, unit }: Props) {
  const isRed = stock < minStock
  const isYellow = !isRed && stock < minStock * 1.5
  const isGreen = !isRed && !isYellow

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isRed && 'bg-red-100 text-red-700',
        isYellow && 'bg-yellow-100 text-yellow-700',
        isGreen && 'bg-green-100 text-green-700',
      )}
    >
      {stock} {unit}
    </span>
  )
}

export function MarginBadge({ costPrice, salePrice }: { costPrice: number; salePrice: number }) {
  if (costPrice === 0 || salePrice === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const margin = ((salePrice - costPrice) / salePrice) * 100
  const isRed = margin < 15
  const isYellow = margin >= 15 && margin < 30

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isRed && 'bg-red-100 text-red-700',
        isYellow && 'bg-yellow-100 text-yellow-700',
        !isRed && !isYellow && 'bg-green-100 text-green-700',
      )}
    >
      {margin.toFixed(0)}%
    </span>
  )
}
