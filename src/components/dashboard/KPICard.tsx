import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string
  icon: ReactNode
  color: string
}

export function KPICard({ label, value, icon, color }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
