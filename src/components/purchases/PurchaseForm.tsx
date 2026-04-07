import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { useCreatePurchaseOrder } from '@/hooks/usePurchases'
import { useUnits } from '@/hooks/useUnits'
import { useCreateConversion } from '@/hooks/useUnitConversions'
import { Button, toast } from '@/components/shared'
import { UNITS as FALLBACK_UNITS } from '@/lib/constants'
import { formatCLP } from '@/utils/currency'
import { toInputDate } from '@/utils/dates'
import { purchaseOrderSchema, type PurchaseLineData } from '@/lib/schemas'
import type { UnitConversion } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { PurchaseFormHeader } from './PurchaseFormHeader'
import { PurchaseFormLines } from './PurchaseFormLines'

interface Props {
  lines: PurchaseLineData[]
  onLinesChange: (lines: PurchaseLineData[]) => void
  onClear: () => void
  initialSupplierId?: string | null
}

export function PurchaseForm({ lines, onLinesChange, onClear, initialSupplierId }: Props) {
  const user = useAuthStore((s) => s.user)
  const activeLocationId = useLocationStore((s) => s.activeLocationId)
  const createPO = useCreatePurchaseOrder()
  const { data: dbUnits } = useUnits()
  const createConversion = useCreateConversion()

  const units = dbUnits && dbUnits.length > 0 ? dbUnits.map((u) => u.name) : FALLBACK_UNITS

  const [supplierId, setSupplierId] = useState('')
  const [buyerName, setBuyerName] = useState(
    user?.user_metadata?.name || user?.email?.split('@')[0] || '',
  )
  const [date, setDate] = useState(toInputDate())
  const [hasInvoice, setHasInvoice] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [comments, setComments] = useState('')

  // Sincronizar supplierId cuando se repite una orden
  useEffect(() => {
    if (initialSupplierId !== undefined) {
      setSupplierId(initialSupplierId ?? '')
    }
  }, [initialSupplierId])

  // Conversiones por producto: { [product_id]: UnitConversion[] }
  const [conversionsMap, setConversionsMap] = useState<Record<string, UnitConversion[]>>({})
  // Ref para trackear IDs ya fetcheadas — evita stale closure sobre conversionsMap
  const fetchedProductIds = useRef<Set<string>>(new Set())

  // Cargar conversiones cuando se agregan nuevos productos
  useEffect(() => {
    const missing = lines
      .map((l) => l.product_id)
      .filter((id) => !fetchedProductIds.current.has(id))
    if (missing.length === 0) return

    for (const id of missing) fetchedProductIds.current.add(id)

    const loadConversions = async () => {
      const { data } = await supabase
        .from('unit_conversions')
        .select('*')
        .in('product_id', missing)

      if (data) {
        setConversionsMap((prev) => {
          const grouped: Record<string, UnitConversion[]> = { ...prev }
          for (const id of missing) grouped[id] = []
          for (const conv of data as UnitConversion[]) {
            if (!grouped[conv.product_id]) grouped[conv.product_id] = []
            grouped[conv.product_id]!.push(conv)
          }
          return grouped
        })
      }
    }
    loadConversions()
  }, [lines])

  const total = lines.reduce((sum, l) => sum + l.qty * l.cost_price, 0)

  const updateLine = (idx: number, updates: Partial<PurchaseLineData>) => {
    onLinesChange(lines.map((l, i) => (i === idx ? { ...l, ...updates } : l)))
  }

  const removeLine = (idx: number) => {
    onLinesChange(lines.filter((_, i) => i !== idx))
  }

  const handleSaveConversion = async (line: PurchaseLineData) => {
    if (!line.purchase_unit || !line.conversion_factor || line.conversion_factor <= 0) return
    try {
      await createConversion.mutateAsync({
        product_id: line.product_id,
        from_unit: line.purchase_unit,
        to_unit: line.unit,
        factor: line.conversion_factor,
      })
      setConversionsMap((prev) => ({
        ...prev,
        [line.product_id]: [
          ...(prev[line.product_id] || []).filter((c) => c.from_unit !== line.purchase_unit),
          {
            id: '',
            product_id: line.product_id,
            from_unit: line.purchase_unit!,
            to_unit: line.unit,
            factor: line.conversion_factor!,
            created_at: '',
            updated_at: '',
          },
        ],
      }))
      toast.success(
        `Conversión guardada: 1 ${line.purchase_unit} = ${line.conversion_factor} ${line.unit}`,
      )
    } catch {
      toast.error('Error al guardar conversión')
    }
  }

  const handleSelectPurchaseUnit = (idx: number, purchaseUnit: string) => {
    const line = lines[idx]
    if (!line) return
    if (purchaseUnit === line.unit || purchaseUnit === '') {
      updateLine(idx, { purchase_unit: undefined, conversion_factor: undefined })
      return
    }
    const conversions = conversionsMap[line.product_id] || []
    const saved = conversions.find((c) => c.from_unit === purchaseUnit)
    updateLine(idx, {
      purchase_unit: purchaseUnit,
      conversion_factor: saved?.factor ?? 1,
    })
  }

  const handleSubmit = async () => {
    if (!activeLocationId) {
      toast.error('Selecciona una ubicación en el encabezado')
      return
    }

    const parsed = purchaseOrderSchema.safeParse({
      supplier_id: supplierId || null,
      buyer_name: buyerName,
      date,
      has_invoice: hasInvoice,
      invoice_number: hasInvoice ? invoiceNumber : undefined,
      comments: comments || undefined,
      items: lines,
    })

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      toast.error(firstError?.message ?? 'Datos inválidos')
      return
    }

    try {
      await createPO.mutateAsync({
        ...parsed.data,
        location_id: activeLocationId,
        items: parsed.data.items.map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          qty: l.qty,
          unit: l.unit,
          cost_price: l.cost_price,
          purchase_unit: l.purchase_unit,
          conversion_factor: l.conversion_factor,
        })),
      })

      const count = lines.length
      toast.success(
        `Orden registrada: ${count} producto${count > 1 ? 's' : ''} · ${formatCLP(total)}`,
      )
      onClear()
      setSupplierId('')
      setHasInvoice(false)
      setInvoiceNumber('')
      setComments('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar orden')
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <PurchaseFormHeader
        supplierId={supplierId}
        onSupplierIdChange={setSupplierId}
        buyerName={buyerName}
        onBuyerNameChange={setBuyerName}
        date={date}
        onDateChange={setDate}
        hasInvoice={hasInvoice}
        onHasInvoiceChange={setHasInvoice}
        invoiceNumber={invoiceNumber}
        onInvoiceNumberChange={setInvoiceNumber}
        comments={comments}
        onCommentsChange={setComments}
      />

      <div className="p-4">
        <PurchaseFormLines
          lines={lines}
          units={units}
          conversionsMap={conversionsMap}
          onUpdateLine={updateLine}
          onRemoveLine={removeLine}
          onSelectPurchaseUnit={handleSelectPurchaseUnit}
          onSaveConversion={handleSaveConversion}
        />

        {lines.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-gray-900">{formatCLP(total)}</span>
          </div>
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
    </div>
  )
}
