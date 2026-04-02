import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, toInputDate } from '@/utils/dates'

describe('formatDate', () => {
  it('formatea fecha ISO a DD/MM/YYYY', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024')
  })

  it('acepta objeto Date', () => {
    expect(formatDate(new Date('2024-01-01T12:00:00Z'))).toMatch(/01\/01\/2024/)
  })
})

describe('formatDateTime', () => {
  it('incluye hora en el formato', () => {
    // Usamos una fecha con hora fija en UTC+0 para evitar flakiness por zona horaria
    const result = formatDateTime('2024-06-20T15:30:00Z')
    expect(result).toMatch(/20\/06\/2024/)
    expect(result).toMatch(/\d{2}:\d{2}/)
  })
})

describe('toInputDate', () => {
  it('sin argumento devuelve fecha de hoy (YYYY-MM-DD)', () => {
    const result = toInputDate()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('convierte fecha ISO a formato input', () => {
    expect(toInputDate('2024-12-25T00:00:00Z')).toBe('2024-12-25')
  })

  it('convierte objeto Date', () => {
    expect(toInputDate(new Date('2024-07-04T00:00:00Z'))).toBe('2024-07-04')
  })
})
