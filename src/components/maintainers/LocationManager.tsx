import { useState, useEffect } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAllLocations, useToggleLocationActive } from '@/hooks/useLocations'
import { Button, EmptyState, toast, Modal, Spinner } from '@/components/shared'
import { cn } from '@/utils/cn'
import type { Location } from '@/lib/types'
import { useCreateLocation, useUpdateLocation } from '@/hooks/useLocations'

const TYPE_LABELS: Record<Location['type'], string> = {
  store: 'Local',
  warehouse: 'Bodega',
  online: 'Online',
}

const TYPE_OPTIONS: { value: Location['type']; label: string }[] = [
  { value: 'store', label: 'Local' },
  { value: 'warehouse', label: 'Bodega' },
  { value: 'online', label: 'Online' },
]

interface FormState {
  name: string
  type: Location['type']
  address: string
  sort_order: string
}

const EMPTY_FORM: FormState = { name: '', type: 'store', address: '', sort_order: '0' }

interface LocationFormModalProps {
  open: boolean
  onClose: () => void
  location: Location | null
}

function LocationFormModal({ open, onClose, location }: LocationFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()

  useEffect(() => {
    if (open) {
      setForm(
        location
          ? {
              name: location.name,
              type: location.type,
              address: location.address ?? '',
              sort_order: String(location.sort_order),
            }
          : EMPTY_FORM,
      )
    }
  }, [open, location])

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim() || null,
      sort_order: parseInt(form.sort_order, 10) || 0,
    }
    try {
      if (location) {
        await updateLocation.mutateAsync({ id: location.id, ...payload })
        toast.success('Ubicación actualizada')
      } else {
        await createLocation.mutateAsync(payload)
        toast.success('Ubicación creada')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const inputClass = 'h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location ? 'Editar Ubicación' : 'Nueva Ubicación'}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Location['type'] }))}
            className={inputClass}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Dirección (opcional)</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Orden</label>
          <input
            type="number"
            min="0"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            loading={createLocation.isPending || updateLocation.isPending}
          >
            {location ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function LocationManager() {
  const { data: locations, isLoading } = useAllLocations()
  const toggleActive = useToggleLocationActive()
  const [editLocation, setEditLocation] = useState<Location | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const handleToggle = async (loc: Location) => {
    try {
      await toggleActive.mutateAsync({ id: loc.id, active: !loc.active })
      toast.success(`${loc.name} ${loc.active ? 'desactivada' : 'activada'}`)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {!locations || locations.length === 0 ? (
        <EmptyState message="No hay ubicaciones registradas" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3 text-center">Orden</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {locations.map((loc) => (
                <tr key={loc.id} className={cn('hover:bg-gray-50', !loc.active && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {loc.name}
                    {!loc.active && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[loc.type]}</td>
                  <td className="px-4 py-3 text-gray-400">{loc.address ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{loc.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditLocation(loc)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(loc)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title={loc.active ? 'Desactivar' : 'Activar'}
                      >
                        {loc.active
                          ? <ToggleRight className="h-4 w-4 text-primary-600" />
                          : <ToggleLeft className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LocationFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        location={null}
      />

      <LocationFormModal
        open={!!editLocation}
        onClose={() => setEditLocation(null)}
        location={editLocation}
      />
    </div>
  )
}
