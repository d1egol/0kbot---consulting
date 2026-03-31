import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import { useUnits } from '@/hooks/useUnits'
import { productSchema, type ProductFormData } from '@/lib/schemas'
import { CATEGORIES, UNITS as FALLBACK_UNITS, DEFAULT_MARGIN_PERCENT } from '@/lib/constants'
import { Modal, Button, toast } from '@/components/shared'
import type { Product } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  product: Product | null
}

export function ProductFormModal({ open, onClose, product }: Props) {
  const isEdit = !!product
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const { data: dbUnits } = useUnits()

  const units = dbUnits && dbUnits.length > 0 ? dbUnits.map((u) => u.name) : FALLBACK_UNITS

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category: 'Frutas',
      unit: 'kg',
      cost_price: 0,
      sale_price: 0,
      margin_percent: DEFAULT_MARGIN_PERCENT,
      min_stock: 3,
      stock: 0,
    },
  })

  useEffect(() => {
    if (open && product) {
      reset({
        name: product.name,
        category: product.category,
        unit: product.unit,
        cost_price: product.cost_price,
        sale_price: product.sale_price,
        margin_percent: product.margin_percent ?? DEFAULT_MARGIN_PERCENT,
        min_stock: product.min_stock,
      })
    } else if (open) {
      reset({
        name: '',
        category: 'Frutas',
        unit: 'kg',
        cost_price: 0,
        sale_price: 0,
        margin_percent: DEFAULT_MARGIN_PERCENT,
        min_stock: 3,
        stock: 0,
      })
    }
  }, [open, product, reset])

  const costPrice = watch('cost_price')
  const salePrice = watch('sale_price')
  const marginPercent = watch('margin_percent')
  const showWarning = costPrice > 0 && salePrice > 0 && salePrice < costPrice

  // Auto-calcular precio de venta cuando cambia el costo o el margen
  useEffect(() => {
    if (costPrice > 0 && marginPercent >= 0 && marginPercent < 100) {
      const suggested = Math.ceil(costPrice / (1 - marginPercent / 100))
      setValue('sale_price', suggested)
    }
  }, [costPrice, marginPercent, setValue])

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({ ...data, id: product.id })
        toast.success(`${data.name} actualizado`)
      } else {
        await createProduct.mutateAsync(data)
        toast.success(`${data.name} creado`)
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Producto' : 'Nuevo Producto'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
          <input
            {...register('name')}
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
            <select
              {...register('category')}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Unidad</label>
            <select
              {...register('unit')}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Precio costo</label>
            <input
              type="number"
              step="1"
              {...register('cost_price', { valueAsNumber: true })}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {errors.cost_price && <p className="mt-1 text-xs text-red-600">{errors.cost_price.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Margen %</label>
            <input
              type="number"
              step="1"
              min="0"
              max="99"
              {...register('margin_percent', { valueAsNumber: true })}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {errors.margin_percent && <p className="mt-1 text-xs text-red-600">{errors.margin_percent.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Precio venta</label>
            <input
              type="number"
              step="1"
              {...register('sale_price', { valueAsNumber: true })}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {errors.sale_price && <p className="mt-1 text-xs text-red-600">{errors.sale_price.message}</p>}
          </div>
        </div>

        {showWarning && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Precio de venta menor al costo
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Stock mínimo</label>
            <input
              type="number"
              step="0.1"
              {...register('min_stock', { valueAsNumber: true })}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stock inicial</label>
              <input
                type="number"
                step="0.1"
                {...register('stock', { valueAsNumber: true })}
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          )}
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
