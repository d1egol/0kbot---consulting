import type { ReactNode } from 'react'

interface Props {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  label?: string
  children?: ReactNode
  rightSlot?: ReactNode
}

/**
 * Filtro reutilizable de rango de fechas.
 *
 * - `children` se renderiza junto a los inputs (ej: selector de proveedor en compras).
 * - `rightSlot` se renderiza pegado a la derecha (ej: totales en SalesHistory).
 */
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  label = 'Período:',
  children,
  rightSlot,
}: Props) {
  const inputClass =
    'h-8 rounded-lg border border-gray-200 px-2 text-sm focus:border-primary-300 focus:outline-none'

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onFromChange(e.target.value)}
        className={inputClass}
      />
      <span className="text-xs text-gray-400">a</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        className={inputClass}
      />
      {children}
      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  )
}
