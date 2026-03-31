import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

type Status = 'online' | 'offline'

export function SyncIndicator() {
  const [status, setStatus] = useState<Status>(
    navigator.onLine ? 'online' : 'offline'
  )

  useEffect(() => {
    const online = () => setStatus('online')
    const offline = () => setStatus('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'online' && 'bg-green-500',
          status === 'offline' && 'bg-red-500',
        )}
      />
      <span className="text-xs text-gray-500">
        {status === 'online' ? 'En línea' : 'Sin conexión'}
      </span>
    </div>
  )
}
