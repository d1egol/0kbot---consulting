import type { ProductCategory, PaymentMethod, ShrinkageReason, UserRole } from './types'

export const CATEGORIES: ProductCategory[] = ['Frutas', 'Verduras', 'Otros', 'Insumos']

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: 'Banknote' },
  { value: 'card', label: 'Tarjeta', icon: 'CreditCard' },
  { value: 'transfer', label: 'Transferencia', icon: 'ArrowRightLeft' },
]

export const SHRINKAGE_REASONS: { value: ShrinkageReason; label: string }[] = [
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'daño', label: 'Daño' },
  { value: 'error', label: 'Error' },
  { value: 'robo', label: 'Robo' },
  { value: 'otro', label: 'Otro' },
]

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'buyer', label: 'Comprador' },
  { value: 'cashier', label: 'Cajero' },
]

export const MARGIN_FACTOR = 0.80

export const UNITS = ['kg', 'unidad', 'atado', 'bandeja', 'frasco', 'rollo', 'ciento', 'caja', 'paquete']
