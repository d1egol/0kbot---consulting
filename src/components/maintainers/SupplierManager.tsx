import { useState } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { useSuppliers, useToggleSupplier } from '@/hooks/useSuppliers'
import { Button, EmptyState, toast } from '@/components/shared'
import { SupplierFormModal } from './SupplierFormModal'
import { cn } from '@/utils/cn'
import type { Supplier } from '@/lib/types'

export function SupplierManager() {
  const { data: suppliers, isLoading } = useSuppliers()
  const toggleSupplier = useToggleSupplier()
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const handleToggle = async (supplier: Supplier) => {
    try {
      await toggleSupplier.mutateAsync({ id: supplier.id, active: !supplier.active })
      toast.success(`${supplier.name} ${supplier.active ? 'desactivado' : 'activado'}`)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
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

      {!suppliers || suppliers.length === 0 ? (
        <EmptyState message="No hay proveedores registrados" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suppliers.map((s) => (
                <tr key={s.id} className={cn('hover:bg-gray-50', !s.active && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.name}
                    {!s.active && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.contact_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditSupplier(s)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(s)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title={s.active ? 'Desactivar' : 'Activar'}
                      >
                        {s.active ? <ToggleRight className="h-4 w-4 text-primary-600" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SupplierFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        supplier={null}
      />
      <SupplierFormModal
        open={!!editSupplier}
        onClose={() => setEditSupplier(null)}
        supplier={editSupplier}
      />
    </div>
  )
}
