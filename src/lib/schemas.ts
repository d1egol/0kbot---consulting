import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
export type LoginFormData = z.infer<typeof loginSchema>

export const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  category: z.enum(['Frutas', 'Verduras', 'Otros', 'Insumos']),
  unit: z.string().min(1, 'Unidad requerida'),
  cost_price: z.number().min(0, 'Debe ser ≥ 0'),
  sale_price: z.number().min(0, 'Debe ser ≥ 0'),
  margin_percent: z.number().min(0, 'Debe ser ≥ 0').max(99, 'Máximo 99%').default(20),
  min_stock: z.number().min(0, 'Debe ser ≥ 0'),
  stock: z.number().min(0, 'Debe ser ≥ 0').optional(),
})
export type ProductFormData = z.infer<typeof productSchema>

export const purchaseLineSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  qty: z.number().positive('Cantidad debe ser > 0'),
  unit: z.string(),
  cost_price: z.number().min(0, 'Costo debe ser ≥ 0'),
  purchase_unit: z.string().optional(),
  conversion_factor: z.number().positive().optional(),
})
export type PurchaseLineData = z.infer<typeof purchaseLineSchema>

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().uuid('Selecciona un proveedor').nullable(),
  buyer_name: z.string().min(1, 'Comprador requerido'),
  date: z.string().min(1, 'Fecha requerida'),
  has_invoice: z.boolean(),
  invoice_number: z.string().optional(),
  comments: z.string().optional(),
  items: z.array(purchaseLineSchema).min(1, 'Agrega al menos un producto'),
})
export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  contact_name: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})
export type SupplierFormData = z.infer<typeof supplierSchema>

export const unitSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  abbreviation: z.string().optional(),
})
export type UnitFormData = z.infer<typeof unitSchema>

export const shrinkageSchema = z.object({
  product_id: z.string().uuid('Selecciona un producto'),
  product_name: z.string(),
  qty: z.number().positive('Cantidad debe ser > 0'),
  unit: z.string(),
  reason: z.enum(['vencimiento', 'daño', 'error', 'robo', 'otro']),
  notes: z.string().optional(),
})
export type ShrinkageFormData = z.infer<typeof shrinkageSchema>
