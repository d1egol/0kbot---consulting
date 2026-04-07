import { create } from 'zustand'
import type { Product, DiscountType } from '@/lib/types'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartState {
  items: CartItem[]
  discountType: DiscountType
  discountValue: number
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  setDiscount: (type: DiscountType, value: number) => void
  clear: () => void
  getSubtotal: () => number
  getDiscountAmount: () => number
  getTotal: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discountType: 'percent',
  discountValue: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        // No superar stock disponible
        if (existing.quantity >= product.stock) return state
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }
      if (product.stock <= 0) return state
      return { items: [...state.items, { product, quantity: 1 }] }
    })
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }))
  },

  updateQty: (productId, qty) => {
    set((state) => {
      if (qty <= 0) {
        return { items: state.items.filter((i) => i.product.id !== productId) }
      }
      return {
        items: state.items.map((i) => {
          if (i.product.id !== productId) return i
          const clampedQty = Math.min(qty, i.product.stock)
          return { ...i, quantity: clampedQty }
        }),
      }
    })
  },

  setDiscount: (type, value) => {
    set({ discountType: type, discountValue: value })
  },

  clear: () => {
    set({ items: [], discountType: 'percent', discountValue: 0 })
  },

  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.quantity * item.product.sale_price,
      0
    )
  },

  getDiscountAmount: () => {
    const { discountType, discountValue } = get()
    const subtotal = get().getSubtotal()
    const safeValue = Number.isFinite(discountValue) && discountValue > 0 ? discountValue : 0
    if (discountType === 'percent') {
      const capped = Math.min(safeValue, 100)
      return Math.round((subtotal * capped) / 100)
    }
    return Math.min(safeValue, subtotal)
  },

  getTotal: () => {
    return Math.max(0, get().getSubtotal() - get().getDiscountAmount())
  },
}))
