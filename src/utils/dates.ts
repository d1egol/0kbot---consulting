import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es })
}

export function toInputDate(date?: string | Date): string {
  const d = date ? new Date(date) : new Date()
  return format(d, 'yyyy-MM-dd')
}
