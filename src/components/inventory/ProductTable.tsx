import { useState } from 'react'
import { Pencil, ToggleLeft, ToggleRight, PackageMinus, ChevronDown, ChevronRight, MapPin } from 'lucide-react'
import { useToggleProduct } from '@/hooks/useProducts'
import { useAllLocationStock } from '@/hooks/useLocationStock'
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
  const { data: allLocationStock = [] } = useAllLocationStock()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Group location stock by product_id (only qty > 0, already filtered by hook)
  const stockByProduct: Record<string, Array<{ location_name: string; qty: number }>> = {}
  for (const row of allLocationStock) {
    if (!stockByProduct[row.product_id]) stockByProduct[row.product_id] = []
    stockByProduct[row.product_id]!.push({ location_name: row.location_name, qty: row.qty })
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
            {sortedData.map((p) => {
              const locationRows = stockByProduct[p.id] ?? []
              const hasMultiLocation = locationRows.length >= 2
              const isExpanded = expandedIds.has(p.id)

              return [
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
                    <div className="flex items-center justify-center gap-1">
                      <StockBadge stock={p.stock} minStock={p.min_stock} unit={p.unit} />
                      {hasMultiLocation && (
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="rounded p-0.5 text-primary-500 hover:bg-primary-50"
                          title="Ver por ubicación"
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
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
                </tr>,
                isExpanded && hasMultiLocation && (
                  <tr key={`${p.id}-locations`} className="bg-primary-50/40">
                    <td colSpan={9} className="px-6 py-2">
                      <div className="flex flex-wrap gap-4">
                        {locationRows.map((lr) => (
                          <div key={lr.location_name} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <MapPin className="h-3 w-3 text-primary-400" />
                            <span className="font-medium text-gray-700">{lr.location_name}:</span>
                            <span>{lr.qty} {p.unit}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {sortedData.map((p) => {
          const locationRows = stockByProduct[p.id] ?? []
          const hasMultiLocation = locationRows.length >= 2
          const isExpanded = expandedIds.has(p.id)

          return (
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
                <div className="flex items-center gap-1">
                  <StockBadge stock={p.stock} minStock={p.min_stock} unit={p.unit} />
                  {hasMultiLocation && (
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="rounded p-0.5 text-primary-500 hover:bg-primary-50"
                      title="Ver por ubicación"
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && hasMultiLocation && (
                <div className="mt-2 flex flex-wrap gap-3 rounded-md bg-primary-50/60 px-3 py-2">
                  {locationRows.map((lr) => (
                    <div key={lr.location_name} className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="h-3 w-3 text-primary-400" />
                      <span className="font-medium">{lr.location_name}:</span>
                      <span>{lr.qty} {p.unit}</span>
                    </div>
                  ))}
                </div>
              )}

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
          )
        })}
      </div>
    </>
  )
}
