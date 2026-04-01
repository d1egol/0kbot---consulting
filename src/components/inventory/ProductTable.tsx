import { Pencil, ToggleLeft, ToggleRight, PackageMinus } from 'lucide-react'
import { useToggleProduct } from '@/hooks/useProducts'
import { useSortable } from '@/hooks/useSortable'
import { StockBadge, MarginBadge, SortableHeader, toast } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import type { Product } from '@/lib/types'
import { cn } from '@/utils/cn'

interface Props {
  products: Product[]
  onEdit: (product: Product) => void
  onAdjustStock?: (product: Product) => void
}

export function ProductTable({ products, onEdit, onAdjustStock }: Props) {
  const toggleProduct = useToggleProduct()
  const { sortedData, sortConfig, requestSort } = useSortable(products)

  const handleToggle = async (product: Product) => {
    try {
      await toggleProduct.mutateAsync({ id: product.id, active: !product.active })
      toast.success(`${product.name} ${product.active ? 'desactivado' : 'activado'}`)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <SortableHeader label="Producto" sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Categoría" sortKey="category" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Unidad" sortKey="unit" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Costo" sortKey="cost_price" sortConfig={sortConfig} onSort={requestSort} className="text-right" />
              <SortableHeader label="Venta" sortKey="sale_price" sortConfig={sortConfig} onSort={requestSort} className="text-right" />
              <SortableHeader label="Margen" sortKey="margin_percent" sortConfig={sortConfig} onSort={requestSort} className="text-center" />
              <SortableHeader label="Stock" sortKey="stock" sortConfig={sortConfig} onSort={requestSort} className="text-center" />
              <SortableHeader label="Mín" sortKey="min_stock" sortConfig={sortConfig} onSort={requestSort} className="text-right" />
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedData.map((p) => (
              <tr key={p.id} className={cn('hover:bg-gray-50', !p.active && 'opacity-50')}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {p.name}
                  {!p.active && (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{p.category}</td>
                <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {p.cost_price > 0 ? formatCLP(p.cost_price) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {p.sale_price > 0 ? formatCLP(p.sale_price) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <MarginBadge costPrice={p.cost_price} salePrice={p.sale_price} />
                </td>
                <td className="px-4 py-3 text-center">
                  <StockBadge stock={p.stock} minStock={p.min_stock} unit={p.unit} />
                </td>
                <td className="px-4 py-3 text-right text-gray-400">{p.min_stock}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(p)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {onAdjustStock && (
                      <button
                        onClick={() => onAdjustStock(p)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Ajustar stock"
                      >
                        <PackageMinus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggle(p)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title={p.active ? 'Desactivar' : 'Activar'}
                    >
                      {p.active ? <ToggleRight className="h-4 w-4 text-primary-600" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {sortedData.map((p) => (
          <div
            key={p.id}
            className={cn('rounded-lg border border-gray-200 bg-white p-4', !p.active && 'opacity-50')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {p.name}
                  {!p.active && (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      Inactivo
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{p.category} · {p.unit}</p>
              </div>
              <StockBadge stock={p.stock} minStock={p.min_stock} unit={p.unit} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Costo: {p.cost_price > 0 ? formatCLP(p.cost_price) : '—'}</span>
                <span>Venta: {p.sale_price > 0 ? formatCLP(p.sale_price) : '—'}</span>
                <MarginBadge costPrice={p.cost_price} salePrice={p.sale_price} />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleToggle(p)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                  title={p.active ? 'Desactivar' : 'Activar'}
                >
                  {p.active ? <ToggleRight className="h-4 w-4 text-primary-600" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => onEdit(p)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
