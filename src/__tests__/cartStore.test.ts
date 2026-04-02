import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/store/cartStore'
import type { Product } from '@/lib/types'

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'Tomate',
  category: 'Verduras',
  unit: 'kg',
  cost_price: 800,
  sale_price: 1000,
  margin_percent: 20,
  stock: 50,
  min_stock: 5,
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clear()
  })

  describe('addItem', () => {
    it('agrega producto nuevo al carrito', () => {
      const product = makeProduct()
      useCartStore.getState().addItem(product)
      const { items } = useCartStore.getState()
      expect(items).toHaveLength(1)
      expect(items[0]!.quantity).toBe(1)
    })

    it('incrementa cantidad si el producto ya existe', () => {
      const product = makeProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)
      const { items } = useCartStore.getState()
      expect(items).toHaveLength(1)
      expect(items[0]!.quantity).toBe(2)
    })

    it('no supera el stock disponible', () => {
      const product = makeProduct({ stock: 2 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product) // intento adicional
      expect(useCartStore.getState().items[0]!.quantity).toBe(2)
    })

    it('no agrega producto sin stock', () => {
      const product = makeProduct({ stock: 0 })
      useCartStore.getState().addItem(product)
      expect(useCartStore.getState().items).toHaveLength(0)
    })
  })

  describe('removeItem', () => {
    it('elimina producto del carrito', () => {
      const product = makeProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().removeItem('prod-1')
      expect(useCartStore.getState().items).toHaveLength(0)
    })
  })

  describe('updateQty', () => {
    it('actualiza cantidad', () => {
      const product = makeProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQty('prod-1', 5)
      expect(useCartStore.getState().items[0]!.quantity).toBe(5)
    })

    it('elimina producto si qty <= 0', () => {
      const product = makeProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQty('prod-1', 0)
      expect(useCartStore.getState().items).toHaveLength(0)
    })

    it('clampea al stock máximo', () => {
      const product = makeProduct({ stock: 10 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQty('prod-1', 999)
      expect(useCartStore.getState().items[0]!.quantity).toBe(10)
    })
  })

  describe('getSubtotal', () => {
    it('calcula subtotal correctamente', () => {
      const p1 = makeProduct({ id: 'p1', sale_price: 1000 })
      const p2 = makeProduct({ id: 'p2', sale_price: 500, stock: 10 })
      useCartStore.getState().addItem(p1)
      useCartStore.getState().addItem(p2)
      useCartStore.getState().updateQty('p1', 3)
      useCartStore.getState().updateQty('p2', 2)
      expect(useCartStore.getState().getSubtotal()).toBe(3 * 1000 + 2 * 500)
    })
  })

  describe('getDiscountAmount', () => {
    it('calcula descuento porcentual', () => {
      const product = makeProduct({ sale_price: 10000 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQty('prod-1', 1)
      useCartStore.getState().setDiscount('percent', 10)
      expect(useCartStore.getState().getDiscountAmount()).toBe(1000)
    })

    it('calcula descuento fijo', () => {
      const product = makeProduct({ sale_price: 10000 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().setDiscount('fixed', 2000)
      expect(useCartStore.getState().getDiscountAmount()).toBe(2000)
    })

    it('descuento fijo no supera el subtotal', () => {
      const product = makeProduct({ sale_price: 1000 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().setDiscount('fixed', 5000)
      expect(useCartStore.getState().getDiscountAmount()).toBe(1000)
    })

    it('descuento porcentual se limita al 100%', () => {
      const product = makeProduct({ sale_price: 1000 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().setDiscount('percent', 150)
      expect(useCartStore.getState().getDiscountAmount()).toBe(1000)
    })
  })

  describe('getTotal', () => {
    it('total nunca es negativo', () => {
      const product = makeProduct({ sale_price: 100 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().setDiscount('fixed', 9999)
      expect(useCartStore.getState().getTotal()).toBe(0)
    })

    it('total = subtotal - descuento', () => {
      const product = makeProduct({ sale_price: 10000 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().setDiscount('percent', 20)
      expect(useCartStore.getState().getTotal()).toBe(8000)
    })
  })

  describe('clear', () => {
    it('limpia items y descuento', () => {
      const product = makeProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().setDiscount('fixed', 500)
      useCartStore.getState().clear()
      const state = useCartStore.getState()
      expect(state.items).toHaveLength(0)
      expect(state.discountValue).toBe(0)
      expect(state.discountType).toBe('percent')
    })
  })
})
