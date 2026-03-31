import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers'
import { supplierSchema, type SupplierFormData } from '@/lib/schemas'
import { Modal, Button, toast } from '@/components/shared'
import type { Supplier } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  supplier: Supplier | null
}

export function SupplierFormModal({ open, onClose, supplier }: Props) {
  const isEdit = !!supplier
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', phone: '', email: '', contact_name: '', address: '', notes: '' },
  })

  useEffect(() => {
    if (open && supplier) {
      reset({
        name: supplier.name,
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        contact_name: supplier.contact_name ?? '',
        address: supplier.address ?? '',
        notes: supplier.notes ?? '',
      })
    } else if (open) {
      reset({ name: '', phone: '', email: '', contact_name: '', address: '', notes: '' })
    }
  }, [open, supplier, reset])

  const onSubmit = async (data: SupplierFormData) => {
    try {
      if (isEdit && supplier) {
        await updateSupplier.mutateAsync({ ...data, id: supplier.id })
        toast.success(`${data.name} actualizado`)
      } else {
        await createSupplier.mutateAsync(data)
        toast.success(`${data.name} creado`)
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const inputClass = 'h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100'

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
          <input {...register('name')} className={inputClass} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contacto</label>
            <input {...register('contact_name')} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
            <input {...register('phone')} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input type="email" {...register('email')} className={inputClass} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
          <input {...register('address')} className={inputClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
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
