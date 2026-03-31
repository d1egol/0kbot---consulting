import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers'
import { useCreatePurchaseOrder } from '@/hooks/usePurchases'
import { Button, Modal, toast } from '@/components/shared'
import { formatCLP } from '@/utils/currency'
import { toInputDate } from '@/utils/dates'
import type { PurchaseLineData } from '@/lib/schemas'

interface Props {
  lines: PurchaseLineData[]
  onLinesChange: (lines: PurchaseLineData[]) => void
  onClear: () => void
}

export function PurchaseForm({ lines, onLinesChange, onClear }: Props) {
  const user = useAuthStore((s) => s.user)
  const { data: suppliers } = useSuppliers()
  const createPO = useCreatePurchaseOrder()
  const createSupplier = useCreateSupplier()

  const [supplierId, setSupplierId] = useState('')
  const [buyerName, setBuyerName] = useState(
    user?.user_metadata?.name || user?.email?.split('@')[0] || ''
  )
  const [date, setDate] = useState(toInputDate())
  const [hasInvoice, setHasInvoice] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [comments, setComments] = useState('')
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')

  const total = lines.reduce((sum, l) => sum + l.qty * l.cost_price, 0)

  const updateLine = (idx: number, field: keyof PurchaseLineData, value: number) => {
    onLinesChange(
      lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    )
  }

  const removeLine = (idx: number) => {
    onLinesChange(lines.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    try {
      await createPO.mutateAsync({
        supplier_id: supplierId || null,
        buyer_name: buyerName,
        date,
        has_invoice: hasInvoice,
        invoice_number: hasInvoice ? invoiceNumber : undefined,
        comments: comments || undefined,
        items: lines.map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          qty: l.qty,
          unit: l.unit,
          cost_price: l.cost_price,
        })),
      })

      const count = lines.length
      toast.success(`Orden registrada: ${count} producto${count > 1 ? 's' : ''} · ${formatCLP(total)}`)
      onClear()
      setSupplierId('')
      setHasInvoice(false)
      setInvoiceNumber('')
      setComments('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar orden')
    }
  }

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    try {
      const supplier = await createSupplier.mutateAsync({
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
      })
      setSupplierId(supplier.id)
      setShowNewSupplier(false)
      setNewSupplierName('')
      setNewSupplierPhone('')
      toast.success(`Proveedor "${supplier.name}" creado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear proveedor')
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Cabecera */}
      <div className="space-y-3 border-b border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-700">Orden de Compra</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Proveedor</label>
            <div className="flex gap-2">
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Sin proveedor</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewSupplier(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Comprador</label>
            <input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              <input
                type="checkbox"
                checked={hasInvoice}
                onChange={(e) => setHasInvoice(e.target.checked)}
                className="mr-2"
              />
              Factura
            </label>
            {hasInvoice && (
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="N° factura"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Comentarios</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      {/* Tabla de líneas */}
      <div className="p-4">
        {lines.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            Selecciona productos del catálogo
          </p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-center">Cant</th>
                    <th className="pb-2">Unid</th>
                    <th className="pb-2 text-right">Costo/u</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lines.map((line, idx) => (
                    <tr key={line.product_id}>
                      <td className="py-2 font-medium text-gray-900">{line.product_name}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={line.qty}
                          onChange={(e) => updateLine(idx, 'qty', parseFloat(e.target.value) || 0)}
                          className="h-9 w-20 rounded border border-gray-200 text-center text-sm focus:border-primary-300 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 text-gray-500">{line.unit}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={line.cost_price}
                          onChange={(e) => updateLine(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                          className="h-9 w-24 rounded border border-gray-200 text-right text-sm focus:border-primary-300 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {formatCLP(line.qty * line.cost_price)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => removeLine(idx)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="space-y-3 md:hidden">
              {lines.map((line, idx) => (
                <div key={line.product_id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{line.product_name}</p>
                    <button onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      step="0.1"
                      value={line.qty}
                      onChange={(e) => updateLine(idx, 'qty', parseFloat(e.target.value) || 0)}
                      className="h-9 w-20 rounded border border-gray-200 text-center text-sm"
                    />
                    <span className="text-xs text-gray-500">{line.unit}</span>
                    <span className="text-xs text-gray-400">×</span>
                    <input
                      type="number"
                      step="1"
                      value={line.cost_price}
                      onChange={(e) => updateLine(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                      className="h-9 w-24 rounded border border-gray-200 text-right text-sm"
                    />
                    <span className="ml-auto text-sm font-medium">{formatCLP(line.qty * line.cost_price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatCLP(total)}</span>
            </div>
          </>
        )}

        <Button
          onClick={handleSubmit}
          loading={createPO.isPending}
          disabled={lines.length === 0}
          className="mt-4 w-full"
        >
          Registrar Orden
        </Button>
      </div>

      {/* Modal nuevo proveedor */}
      <Modal open={showNewSupplier} onClose={() => setShowNewSupplier(false)} title="Nuevo Proveedor">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
            <input
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono (opcional)</label>
            <input
              value={newSupplierPhone}
              onChange={(e) => setNewSupplierPhone(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNewSupplier(false)}>Cancelar</Button>
            <Button onClick={handleCreateSupplier} loading={createSupplier.isPending}>Crear</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
