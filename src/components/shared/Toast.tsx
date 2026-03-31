import { useEffect } from 'react'
import { create } from 'zustand'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: number) => void
}

let nextId = 0

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2500)
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const styles = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
}

function ToastItem({ item }: { item: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const Icon = icons[item.type]

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
        'animate-in slide-in-from-right-5',
        styles[item.type],
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">{item.message}</p>
      <button
        onClick={() => removeToast(item.id)}
        className="shrink-0 rounded p-0.5 hover:bg-black/5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  // Animaciones CSS inline ya que Tailwind no tiene animate-in por defecto
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slide-in-right {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .animate-in { animation: slide-in-right 0.2s ease-out; }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} />
      ))}
    </div>
  )
}
