import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers'
import { Button, Modal, toast } from '@/components/shared'

interface Props {
  supplierId: string
  onSupplierIdChange: (id: string) => void
  buyerName: string
  onBuyerNameChange: (name: string) => void
  date: string
  onDateChange: (date: string) => void
  hasInvoice: boolean
  onHasInvoiceChange: (has: boolean) => void
  invoiceNumber: string
  onInvoiceNumberChange: (num: string) => void
  comments: string
  onCommentsChange: (c: string) => void
}

export function PurchaseFormHeader({
  supplierId,
  onSupplierIdChange,
  buyerName,
  onBuyerNameChange,
  date,
  onDateChange,
  hasInvoice,
  onHasInvoiceChange,
  invoiceNumber,
  onInvoiceNumberChange,
  comments,
  onCommentsChange,
}: Props) {
  const { data: suppliers } = useSuppliers()
  const createSupplier = useCreateSupplier()

  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')

  const activeSuppliers = suppliers?.filter((s) => s.active !== false) ?? []

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    try {
      const supplier = await createSupplier.mutateAsync({
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
      })
      onSupplierIdChange(supplier.id)
      setShowNewSupplier(false)
      setNewSupplierName('')
      setNewSupplierPhone('')
      toast.success(`Proveedor "${supplier.name}" creado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear proveedor')
    }
  }

  return (
    <div className="space-y-3 border-b border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700">Orden de Compra</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Proveedor</label>
          <div className="flex gap-2">
            <select
              value={supplierId}
              onChange={(e) => onSupplierIdChange(e.target.value)}
              className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Sin proveedor</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
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
            onChange={(e) => onBuyerNameChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            <input
              type="checkbox"
              checked={hasInvoice}
              onChange={(e) => onHasInvoiceChange(e.target.checked)}
              className="mr-2"
            />
            Factura
          </label>
          {hasInvoice && (
            <input
              value={invoiceNumber}
              onChange={(e) => onInvoiceNumberChange(e.target.value)}
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
          onChange={(e) => onCommentsChange(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <Modal
        open={showNewSupplier}
        onClose={() => setShowNewSupplier(false)}
        title="Nuevo Proveedor"
      >
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
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Teléfono (opcional)
            </label>
            <input
              value={newSupplierPhone}
              onChange={(e) => setNewSupplierPhone(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNewSupplier(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSupplier} loading={createSupplier.isPending}>
              Crear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
