import { useState } from 'react'
import { Plus, Eye, EyeOff } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { CategoryChips, SearchInput, Button, EmptyState } from '@/components/shared'
import { ProductTable } from '@/components/inventory/ProductTable'
import { ProductFormModal } from '@/components/inventory/ProductFormModal'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'
import type { Product, ProductCategory } from '@/lib/types'

export default function Inventory() {
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [search, setSearch] = useState('')
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const { data: products, isLoading } = useProducts(category, search, showInactive)

  const lowStockCount = products?.filter((p) => p.stock < p.min_stock && p.active).length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
          {lowStockCount > 0 && (
            <p className="text-sm text-red-600">
              {lowStockCount} producto{lowStockCount > 1 ? 's' : ''} bajo stock mínimo
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showInactive ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            title={showInactive ? 'Ocultar inactivos' : 'Mostrar inactivos'}
          >
            {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <CategoryChips selected={category} onChange={(c) => setCategory(c as ProductCategory | null)} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar producto..."
          className="sm:ml-auto sm:w-64"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : products && products.length > 0 ? (
        <ProductTable products={products} onEdit={setEditProduct} onAdjustStock={setAdjustProduct} />
      ) : (
        <EmptyState message="No se encontraron productos" />
      )}

      <ProductFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        product={null}
      />

      <ProductFormModal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        product={editProduct}
      />

      <StockAdjustModal
        open={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        product={adjustProduct}
      />
    </div>
  )
}
