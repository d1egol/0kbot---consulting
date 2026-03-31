import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateUnit, useUpdateUnit } from '@/hooks/useUnits'
import { unitSchema, type UnitFormData } from '@/lib/schemas'
import { Modal, Button, toast } from '@/components/shared'
import type { Unit } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  unit: Unit | null
}

export function UnitFormModal({ open, onClose, unit }: Props) {
  const isEdit = !!unit
  const createUnit = useCreateUnit()
  const updateUnit = useUpdateUnit()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: '', abbreviation: '' },
  })

  useEffect(() => {
    if (open && unit) {
      reset({ name: unit.name, abbreviation: unit.abbreviation ?? '' })
    } else if (open) {
      reset({ name: '', abbreviation: '' })
    }
  }, [open, unit, reset])

  const onSubmit = async (data: UnitFormData) => {
    try {
      if (isEdit && unit) {
        await updateUnit.mutateAsync({ ...data, id: unit.id })
        toast.success(`${data.name} actualizada`)
      } else {
        await createUnit.mutateAsync(data)
        toast.success(`${data.name} creada`)
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const inputClass = 'h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Unidad' : 'Nueva Unidad'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
          <input {...register('name')} placeholder="ej: kilogramo" className={inputClass} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Abreviación</label>
          <input {...register('abbreviation')} placeholder="ej: kg" className={inputClass} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
