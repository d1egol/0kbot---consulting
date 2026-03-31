import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  onSubmit?: () => void
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', autoFocus, className, onSubmit }: Props) {
  const [local, setLocal] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleChange = (val: string) => {
    setLocal(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(val), 300)
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) onSubmit()
        }}
        placeholder={placeholder}
        className={cn(
          'h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-9 text-sm',
          'placeholder:text-gray-400',
          'focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100',
        )}
      />
      {local && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
