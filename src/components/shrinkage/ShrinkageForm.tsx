import { useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useCreateShrinkage } from '@/hooks/useShrinkage'
import { CategoryChips, SearchInput, Button, toast, StockBadge } from '@/components/shared'
import { SHRINKAGE_REASONS } from '@/lib/constants'
import { formatCLP } from '@/utils/currency'
import { toInputDate } from '@/utils/dates'
import type { Product, ProductCategory, ShrinkageReason } from '@/lib/types'

export function ShrinkageForm() {
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [qty, setQty] = useState<number>(0)
  const [reason, setReason] = useState<ShrinkageReason>('vencimiento')
  const [date, setDate] = useState(toInputDate())
  const [notes, setNotes] = useState('')

  const { data: products } = useProducts(category, search)
  const createShrinkage = useCreateShrinkage()

  const estimatedValue = selected ? qty * selected.cost_price : 0

  const handleSubmit = async () => {
    if (!selected) {
      toast.error('Selecciona un producto')
      return
    }
    if (qty <= 0) {
      toast.error('Cantidad debe ser mayor a 0')
      return
    }
    if (qty > selected.stock) {
      toast.error(`Stock insuficiente: disponible ${selected.stock}`)
      return
    }

    try {
      await createShrinkage.mutateAsync({
        product_id: selected.id,
        product_name: selected.name,
        qty,
        unit: selected.unit,
        reason,
        notes: notes || undefined,
        date,
      })
      toast.success(`Merma registrada: ${qty} ${selected.unit} de ${selected.name}`)
      setSelected(null)
      setQty(0)
      setNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar merma')
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Registrar Merma</h2>

      {/* Selector de producto */}
      {!selected ? (
        <div className="space-y-3">
          <CategoryChips selected={category} onChange={(c) => setCategory(c as ProductCategory | null)} />
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar producto..." />
          <div className="max-h-48 overflow-y-auto">
            {products?.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-primary-50"
              >
                <span className="text-sm font-medium text-gray-900">{p.name}</span>
                <StockBadge stock={p.stock} minStock={p.min_stock} unit={p.unit} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Producto seleccionado */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500">
                Stock: {selected.stock} {selected.unit}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-primary-600 hover:underline"
            >
              Cambiar
            </button>
          </div>

          {/* Cantidad */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cantidad ({selected.unit})
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={selected.stock}
              value={qty || ''}
              onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {qty > selected.stock && (
              <p className="mt-1 text-xs text-red-600">Excede el stock disponible</p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Motivo</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ShrinkageReason)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {SHRINKAGE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Valor estimado */}
          {estimatedValue > 0 && (
            <div className="rounded-lg bg-yellow-50 p-3 text-center">
              <p className="text-xs text-yellow-600">Valor estimado de pérdida</p>
              <p className="text-lg font-bold text-yellow-700">{formatCLP(estimatedValue)}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            loading={createShrinkage.isPending}
            disabled={qty <= 0 || qty > selected.stock}
            className="w-full"
          >
            Registrar Merma
          </Button>
        </div>
      )}
    </div>
  )
}
