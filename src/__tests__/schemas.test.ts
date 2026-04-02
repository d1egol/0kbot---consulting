import { describe, it, expect } from 'vitest'
import { purchaseLineSchema, productSchema, shrinkageSchema } from '@/lib/schemas'

describe('purchaseLineSchema', () => {
  const validLine = {
    product_id: '123e4567-e89b-12d3-a456-426614174000',
    product_name: 'Tomate',
    qty: 5,
    unit: 'kg',
    cost_price: 800,
  }

  it('acepta línea válida', () => {
    const result = purchaseLineSchema.safeParse(validLine)
    expect(result.success).toBe(true)
  })

  it('rechaza qty <= 0', () => {
    const result = purchaseLineSchema.safeParse({ ...validLine, qty: 0 })
    expect(result.success).toBe(false)
  })

  it('rechaza cost_price negativo', () => {
    const result = purchaseLineSchema.safeParse({ ...validLine, cost_price: -1 })
    expect(result.success).toBe(false)
  })

  it('acepta conversion_factor positivo', () => {
    const result = purchaseLineSchema.safeParse({
      ...validLine,
      purchase_unit: 'caja',
      conversion_factor: 18,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza conversion_factor <= 0', () => {
    const result = purchaseLineSchema.safeParse({
      ...validLine,
      purchase_unit: 'caja',
      conversion_factor: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('productSchema', () => {
  const validProduct = {
    name: 'Manzana',
    category: 'Frutas' as const,
    unit: 'kg',
    cost_price: 500,
    sale_price: 650,
    margin_percent: 20,
    min_stock: 5,
  }

  it('acepta producto válido', () => {
    const result = productSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
  })

  it('rechaza categoría inválida', () => {
    const result = productSchema.safeParse({ ...validProduct, category: 'Cereales' })
    expect(result.success).toBe(false)
  })

  it('rechaza margin_percent > 99', () => {
    const result = productSchema.safeParse({ ...validProduct, margin_percent: 100 })
    expect(result.success).toBe(false)
  })

  it('acepta margin_percent = 0', () => {
    const result = productSchema.safeParse({ ...validProduct, margin_percent: 0 })
    expect(result.success).toBe(true)
  })

  it('valor por defecto de margin_percent es 20', () => {
    const result = productSchema.safeParse({ ...validProduct, margin_percent: undefined })
    if (result.success) {
      expect(result.data.margin_percent).toBe(20)
    }
  })
})

describe('shrinkageSchema', () => {
  it('acepta razón válida', () => {
    const result = shrinkageSchema.safeParse({
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      product_name: 'Lechuga',
      qty: 2,
      unit: 'kg',
      reason: 'vencimiento',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza razón inválida', () => {
    const result = shrinkageSchema.safeParse({
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      product_name: 'Lechuga',
      qty: 2,
      unit: 'kg',
      reason: 'extraviado',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza qty negativa', () => {
    const result = shrinkageSchema.safeParse({
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      product_name: 'Lechuga',
      qty: -1,
      unit: 'kg',
      reason: 'daño',
    })
    expect(result.success).toBe(false)
  })
})
