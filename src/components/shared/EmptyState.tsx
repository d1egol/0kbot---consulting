import type { ReactNode } from 'react'
import { PackageOpen } from 'lucide-react'

interface Props {
  icon?: ReactNode
  message: string
  action?: ReactNode
}

export function EmptyState({ icon, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="text-gray-300">
        {icon || <PackageOpen className="h-12 w-12" />}
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      {action}
    </div>
  )
}
