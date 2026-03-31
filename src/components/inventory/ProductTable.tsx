import { Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { useToggleProduct } from '@/hooks/useProducts'
import { StockBadge, MarginBadge, toast } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import type { Product } from '@/lib/types'

interface Props {
  products: Product[]
  onEdit: (product: Product) => void
}

export function ProductTable({ products, onEdit }: Props) {
  const toggleProduct = useToggleProduct()

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
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3 text-right">Costo</th>
              <th className="px-4 py-3 text-right">Venta</th>
              <th className="px-4 py-3 text-center">Margen</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-right">Mín</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
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
        {products.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
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
              <button
                onClick={() => onEdit(p)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
