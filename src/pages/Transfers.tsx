import { useState } from 'react'
import { ArrowRightLeft, Plus, MapPin } from 'lucide-react'
import { useLocations } from '@/hooks/useLocations'
import { useStockTransfers, useTransferStock } from '@/hooks/useStockTransfers'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { useProducts } from '@/hooks/useProducts'
import { Button, Modal, toast } from '@/components/shared'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function TransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const activeLocationId = useLocationStore((s) => s.activeLocationId)

  const [fromId, setFromId] = useState(activeLocationId ?? '')
  const [toId, setToId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState<number>(0)
  const [notes, setNotes] = useState('')

  const { data: locations = [] } = useLocations()
  const { data: products = [] } = useProducts(null, '')
  const transferStock = useTransferStock()

  const handleSubmit = async () => {
    if (!fromId || !toId) {
      toast.error('Selecciona origen y destino')
      return
    }
    if (fromId === toId) {
      toast.error('Origen y destino deben ser distintos')
      return
    }
    if (!productId) {
      toast.error('Selecciona un producto')
      return
    }
    if (qty <= 0) {
      toast.error('Cantidad debe ser mayor a 0')
      return
    }

    const transferredBy = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario'

    try {
      await transferStock.mutateAsync({
        from_location_id: fromId,
        to_location_id: toId,
        product_id: productId,
        qty,
        transferred_by: transferredBy,
        notes: notes || undefined,
      })
      const product = products.find((p) => p.id === productId)
      const from = locations.find((l) => l.id === fromId)
      const to = locations.find((l) => l.id === toId)
      toast.success(`Transferido: ${qty} ${product?.unit ?? ''} de ${from?.name} → ${to?.name}`)
      onClose()
      setQty(0)
      setNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al transferir')
    }
  }

  const inputClass = 'h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

  return (
    <Modal open={open} onClose={onClose} title="Transferir Stock">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputClass}>
              <option value="">Seleccionar</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hacia</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputClass}>
              <option value="">Seleccionar</option>
              {locations.filter((l) => l.id !== fromId).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Producto</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
            <option value="">Seleccionar</option>
            {products.filter((p) => p.active && p.stock > 0).map((p) => (
              <option key={p.id} value={p.id}>{p.name} (stock: {p.stock} {p.unit})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={qty || ''}
            onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notas (opcional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            loading={transferStock.isPending}
          >
            Transferir
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Transfers() {
  const [showModal, setShowModal] = useState(false)
  const { data: transfers = [], isLoading } = useStockTransfers(100)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Transferencias de Stock</h1>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Nueva transferencia
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : transfers.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
          <ArrowRightLeft className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay transferencias registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Desde</th>
                <th className="px-4 py-3">Hacia</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3">Por</th>
                <th className="px-4 py-3">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                    {format(new Date(t.created_at), 'd MMM HH:mm', { locale: es })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.product_name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {(t as any).from_location?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-3 w-3 text-primary-400" />
                      {(t as any).to_location?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{t.qty}</td>
                  <td className="px-4 py-3 text-gray-500">{t.transferred_by}</td>
                  <td className="px-4 py-3 text-gray-400">{t.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransferModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
