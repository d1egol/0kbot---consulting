import { describe, it, expect } from 'vitest'
import { formatCLP } from '@/utils/currency'

describe('formatCLP', () => {
  it('formatea mil pesos', () => {
    expect(formatCLP(1000)).toBe('$1.000')
  })

  it('formatea cero', () => {
    expect(formatCLP(0)).toBe('$0')
  })

  it('formatea números grandes', () => {
    expect(formatCLP(1_000_000)).toBe('$1.000.000')
  })

  it('redondea decimales a entero', () => {
    // CLP no tiene decimales
    expect(formatCLP(1500.9)).toBe('$1.501')
  })

  it('formatea número negativo', () => {
    // es-CL coloca el signo negativo después del símbolo de moneda
    expect(formatCLP(-500)).toBe('$-500')
  })
})
