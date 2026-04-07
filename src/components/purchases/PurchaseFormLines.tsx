import { Trash2, ArrowRightLeft } from 'lucide-react'
import { formatCLP } from '@/utils/currency'
import type { PurchaseLineData } from '@/lib/schemas'
import type { UnitConversion } from '@/lib/types'

interface Props {
  lines: PurchaseLineData[]
  units: string[]
  conversionsMap: Record<string, UnitConversion[]>
  onUpdateLine: (idx: number, updates: Partial<PurchaseLineData>) => void
  onRemoveLine: (idx: number) => void
  onSelectPurchaseUnit: (idx: number, unit: string) => void
  onSaveConversion: (line: PurchaseLineData) => void
}

export function PurchaseFormLines({
  lines,
  units,
  conversionsMap,
  onUpdateLine,
  onRemoveLine,
  onSelectPurchaseUnit,
  onSaveConversion,
}: Props) {
  if (lines.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Selecciona productos del catálogo</p>
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
              <th className="pb-2">Producto</th>
              <th className="pb-2 text-center">Cant</th>
              <th className="pb-2">Unid Compra</th>
              <th className="pb-2 text-right">Costo/u</th>
              <th className="pb-2 text-right">Total</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lines.map((line, idx) => {
              const hasConversion =
                line.purchase_unit && line.purchase_unit !== line.unit && line.conversion_factor
              const baseQty = hasConversion ? line.qty * (line.conversion_factor ?? 1) : line.qty
              const conversions = conversionsMap[line.product_id] || []

              return (
                <tr key={line.product_id}>
                  <td className="py-2">
                    <span className="font-medium text-gray-900">{line.product_name}</span>
                    {hasConversion && (
                      <span className="ml-2 text-xs text-primary-600">
                        = {baseQty.toFixed(1)} {line.unit}
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={line.qty}
                      onChange={(e) => onUpdateLine(idx, { qty: parseFloat(e.target.value) || 0 })}
                      className="h-9 w-20 rounded border border-gray-200 text-center text-sm focus:border-primary-300 focus:outline-none"
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <select
                        value={line.purchase_unit || line.unit}
                        onChange={(e) => onSelectPurchaseUnit(idx, e.target.value)}
                        className="h-9 rounded border border-gray-200 px-2 text-sm focus:border-primary-300 focus:outline-none"
                      >
                        <option value={line.unit}>{line.unit}</option>
                        {units
                          .filter((u) => u !== line.unit)
                          .map((u) => (
                            <option key={u} value={u}>
                              {u}
                              {conversions.find((c) => c.from_unit === u) ? ' *' : ''}
                            </option>
                          ))}
                      </select>
                      {line.purchase_unit && line.purchase_unit !== line.unit && (
                        <div className="flex items-center gap-1">
                          <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={line.conversion_factor ?? 1}
                            onChange={(e) =>
                              onUpdateLine(idx, {
                                conversion_factor: parseFloat(e.target.value) || 1,
                              })
                            }
                            className="h-9 w-16 rounded border border-gray-200 text-center text-sm focus:border-primary-300 focus:outline-none"
                            title={`1 ${line.purchase_unit} = ? ${line.unit}`}
                          />
                          <span className="text-xs text-gray-400">{line.unit}</span>
                          <button
                            onClick={() => onSaveConversion(line)}
                            className="rounded px-1.5 py-0.5 text-[10px] text-primary-600 hover:bg-primary-50"
                            title="Guardar conversión"
                          >
                            Guardar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={line.cost_price}
                      onChange={(e) =>
                        onUpdateLine(idx, { cost_price: parseFloat(e.target.value) || 0 })
                      }
                      className="h-9 w-24 rounded border border-gray-200 text-right text-sm focus:border-primary-300 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {formatCLP(line.qty * line.cost_price)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => onRemoveLine(idx)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {lines.map((line, idx) => {
          const hasConversion =
            line.purchase_unit && line.purchase_unit !== line.unit && line.conversion_factor
          const baseQty = hasConversion ? line.qty * (line.conversion_factor ?? 1) : line.qty
          const conversions = conversionsMap[line.product_id] || []

          return (
            <div key={line.product_id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{line.product_name}</p>
                <button
                  onClick={() => onRemoveLine(idx)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={line.qty}
                  onChange={(e) => onUpdateLine(idx, { qty: parseFloat(e.target.value) || 0 })}
                  className="h-9 w-20 rounded border border-gray-200 text-center text-sm"
                />
                <select
                  value={line.purchase_unit || line.unit}
                  onChange={(e) => onSelectPurchaseUnit(idx, e.target.value)}
                  className="h-9 rounded border border-gray-200 px-2 text-sm"
                >
                  <option value={line.unit}>{line.unit}</option>
                  {units
                    .filter((u) => u !== line.unit)
                    .map((u) => (
                      <option key={u} value={u}>
                        {u}
                        {conversions.find((c) => c.from_unit === u) ? ' *' : ''}
                      </option>
                    ))}
                </select>
                <span className="text-xs text-gray-400">x</span>
                <input
                  type="number"
                  step="1"
                  value={line.cost_price}
                  onChange={(e) =>
                    onUpdateLine(idx, { cost_price: parseFloat(e.target.value) || 0 })
                  }
                  className="h-9 w-24 rounded border border-gray-200 text-right text-sm"
                />
                <span className="ml-auto text-sm font-medium">
                  {formatCLP(line.qty * line.cost_price)}
                </span>
              </div>
              {hasConversion && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-primary-600">
                    1 {line.purchase_unit} = {line.conversion_factor} {line.unit} →{' '}
                    {baseQty.toFixed(1)} {line.unit} al stock
                  </span>
                  <button
                    onClick={() => onSaveConversion(line)}
                    className="text-[10px] text-primary-600 underline"
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
