import { useState } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAllUnits, useToggleUnit } from '@/hooks/useUnits'
import { Button, EmptyState, toast } from '@/components/shared'
import { UnitFormModal } from './UnitFormModal'
import { cn } from '@/utils/cn'
import type { Unit } from '@/lib/types'

export function UnitManager() {
  const { data: units, isLoading } = useAllUnits()
  const toggleUnit = useToggleUnit()
  const [editUnit, setEditUnit] = useState<Unit | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const handleToggle = async (unit: Unit) => {
    try {
      await toggleUnit.mutateAsync({ id: unit.id, active: !unit.active })
      toast.success(`${unit.name} ${unit.active ? 'desactivada' : 'activada'}`)
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

      {!units || units.length === 0 ? (
        <EmptyState message="No hay unidades registradas" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Abreviación</th>
                <th className="px-4 py-3 text-center">Orden</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {units.map((u) => (
                <tr key={u.id} className={cn('hover:bg-gray-50', !u.active && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.name}
                    {!u.active && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.abbreviation || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{u.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditUnit(u)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(u)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title={u.active ? 'Desactivar' : 'Activar'}
                      >
                        {u.active ? <ToggleRight className="h-4 w-4 text-primary-600" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UnitFormModal open={showCreate} onClose={() => setShowCreate(false)} unit={null} />
      <UnitFormModal open={!!editUnit} onClose={() => setEditUnit(null)} unit={editUnit} />
    </div>
  )
}
