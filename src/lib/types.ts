export type UserRole = 'admin' | 'buyer' | 'cashier'

export type ProductCategory = 'Frutas' | 'Verduras' | 'Otros' | 'Insumos'

export type PaymentMethod = 'cash' | 'card' | 'transfer'

export type DiscountType = 'percent' | 'fixed'

export type ShrinkageReason = 'vencimiento' | 'daño' | 'error' | 'robo' | 'otro'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  unit: string
  cost_price: number
  sale_price: number
  margin_percent: number
  stock: number
  min_stock: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface PriceHistory {
  id: string
  product_id: string
  cost_price: number
  sale_price: number
  purchase_order_id: string | null
  recorded_at: string
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  contact_name: string | null
  address: string | null
  notes: string | null
  active: boolean
  created_at: string
}

export interface Unit {
  id: string
  name: string
  abbreviation: string | null
  active: boolean
  sort_order: number
  created_at: string
}

export interface UnitConversion {
  id: string
  product_id: string
  from_unit: string
  to_unit: string
  factor: number
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  date: string
  supplier_id: string | null
  buyer_name: string
  has_invoice: boolean
  invoice_number: string | null
  comments: string | null
  total_cost: number
  voided: boolean
  voided_at: string | null
  location_id: string | null
  created_at: string
  supplier?: Supplier
  items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchase_order_id: string
  product_id: string
  product_name: string
  qty: number
  unit: string
  cost_price: number
  total_cost: number
  purchase_unit: string | null
  conversion_factor: number | null
  base_qty: number | null
}

export interface Sale {
  id: string
  date: string
  cashier_name: string
  subtotal: number
  discount: number
  discount_type: DiscountType | null
  total: number
  payment_method: PaymentMethod
  cash_received: number | null
  cash_change: number | null
  voided: boolean
  voided_at: string | null
  location_id: string | null
  created_at: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  qty: number
  unit_price: number
  subtotal: number
  cost_total?: number | null
}

export interface StockLot {
  id: string
  product_id: string
  source_type: 'purchase' | 'adjustment'
  source_id: string
  purchase_item_id: string | null
  qty_initial: number
  qty_remaining: number
  cost_per_unit: number
  lot_date: string
  created_at: string
}

export interface LotConsumption {
  id: string
  lot_id: string
  consumed_type: 'sale' | 'shrinkage'
  consumed_id: string
  consumed_item_id: string | null
  qty: number
  cost_per_unit: number
  created_at: string
}

export interface ShrinkageRecord {
  id: string
  date: string
  product_id: string
  product_name: string
  qty: number
  unit: string
  reason: ShrinkageReason
  estimated_value: number | null
  notes: string | null
  voided: boolean
  location_id: string | null
  created_at: string
}

export interface Location {
  id: string
  name: string
  type: 'store' | 'warehouse' | 'online'
  address: string | null
  active: boolean
  sort_order: number
  created_at: string
}

export interface LocationStock {
  location_id: string
  product_id: string
  qty: number
  updated_at: string
}

export interface StockTransfer {
  id: string
  from_location_id: string | null
  to_location_id: string | null
  product_id: string
  product_name: string
  qty: number
  transferred_by: string
  notes: string | null
  created_at: string
}

export interface StockTransferWithLocations extends StockTransfer {
  from_location: { name: string } | null
  to_location: { name: string } | null
}
