# CLAUDE.md — Dos Huertos

## Proyecto

App de gestión para verdulería/frutería "Dos Huertos" en Chile. Maneja compras a proveedores, punto de venta (POS), inventario con conversión de unidades, control de mermas, **multi-local** con transferencias entre bodegas/tiendas, **lotes FIFO** para costeo real, ajustes de stock con motivo, y dashboard con KPIs/alertas.

## Comandos

```bash
npm install              # Instalar dependencias
npm run dev              # Servidor de desarrollo (Vite)
npm run build            # tsc -b && vite build
npm run preview          # Preview del build local
npm run lint             # ESLint
npm run lint:fix         # ESLint --fix
npm run type-check       # tsc -b --noEmit
npm run format           # Prettier write
npm run format:check     # Prettier check
npm test                 # Vitest watch
npm run test:watch       # Vitest watch (alias)
npm run test:coverage    # Vitest run --coverage
```

## Stack

- **Frontend**: React 18, Vite 6, TypeScript strict (`noUncheckedIndexedAccess`), Tailwind CSS v3
- **Backend**: Supabase (Auth + PostgreSQL + Realtime + RLS)
- **Estado**: Zustand (`authStore`, `cartStore`, `locationStore` con `persist`), TanStack React Query 5 (server state)
- **Forms**: React Hook Form + Zod
- **Gráficos**: recharts
- **Iconos**: lucide-react
- **Tests**: Vitest + jsdom + @testing-library/react + MSW
- **Lint/Format**: ESLint flat config + Prettier
- **Deploy**: Vercel (auto-deploy desde `main`)

## Arquitectura

### Rutas y roles

| Ruta | Roles permitidos |
|------|------------------|
| `/` (Dashboard) | admin |
| `/pos` | cashier, admin |
| `/purchases` | buyer, admin |
| `/inventory` | admin, buyer |
| `/transfers` | admin, buyer |
| `/shrinkage` | todos los autenticados |
| `/maintainers` | admin |

### Estructura de archivos

```
src/
├── pages/                       # Una página por ruta
│   ├── Dashboard.tsx            # Orquestador del dashboard
│   ├── POS.tsx
│   ├── Purchases.tsx
│   ├── Inventory.tsx
│   ├── Transfers.tsx
│   ├── Shrinkage.tsx
│   └── Maintainers.tsx
│
├── components/
│   ├── shared/                  # Reutilizables sin dominio
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Spinner.tsx          # sm/md/lg
│   │   ├── DateRangeFilter.tsx  # Filtro de fechas reutilizable
│   │   ├── SearchInput.tsx
│   │   ├── SortableHeader.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── StockBadge.tsx
│   │   ├── MarginBadge.tsx
│   │   ├── CategoryChips.tsx
│   │   ├── SyncIndicator.tsx
│   │   └── LocationSelector.tsx
│   │
│   ├── dashboard/               # Sub-componentes del Dashboard
│   │   ├── KPICard.tsx
│   │   ├── KPISection.tsx       # KPISectionToday + KPISectionRange
│   │   ├── SalesChart.tsx
│   │   ├── PaymentBreakdown.tsx
│   │   ├── TopProducts.tsx
│   │   ├── SupplierBreakdown.tsx
│   │   ├── ShrinkageBreakdown.tsx
│   │   └── StockAlerts.tsx
│   │
│   ├── purchases/               # PurchaseForm + ProductCatalog + History
│   │   ├── PurchaseForm.tsx           # Orquestador
│   │   ├── PurchaseFormHeader.tsx     # Cabecera (proveedor, fecha, etc.)
│   │   ├── PurchaseFormLines.tsx      # Tabla de líneas
│   │   ├── ProductCatalog.tsx
│   │   └── PurchaseHistory.tsx
│   │
│   ├── pos/                     # SalesHistory, etc.
│   ├── inventory/               # ProductFormModal, etc.
│   └── shrinkage/
│
├── hooks/                       # 15 hooks
│   ├── useProducts.ts           # query/mutaciones de productos
│   ├── useSales.ts              # ventas + register_sale RPC
│   ├── usePurchases.ts          # órdenes + register_purchase_order RPC
│   ├── useShrinkage.ts          # mermas + register_shrinkage RPC
│   ├── useSuppliers.ts
│   ├── useUnits.ts
│   ├── useUnitConversions.ts
│   ├── useLocations.ts          # multi-local
│   ├── useLocationStock.ts      # stock por ubicación con joins tipados
│   ├── useStockTransfers.ts     # transferencias entre locations
│   ├── useStockAdjustment.ts    # ajustes manuales con motivo
│   ├── usePriceHistory.ts       # historial de costos
│   ├── useDashboard.ts          # KPIs, gráficos, alertas (el más complejo)
│   ├── useDebounce.ts
│   └── useSortable.ts           # Sorting genérico para tablas
│
├── store/                       # Zustand
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── locationStore.ts         # activeLocationId persistido
│
├── providers/
│   └── QueryProvider.tsx        # QueryClient + RealtimeBridge centralizado
│
├── lib/
│   ├── types.ts                 # Todas las interfaces TS
│   ├── schemas.ts               # Todos los schemas Zod
│   ├── constants.ts             # CATEGORIES, PAYMENT_METHODS, SHRINKAGE_REASONS, UNITS
│   └── supabase.ts              # Cliente Supabase
│
├── utils/                       # currency, dates, cn
├── __tests__/                   # Tests
│   ├── components/              # Button, Modal, Spinner
│   ├── hooks/                   # useProducts, useSales, useStockTransfers, useDashboard
│   ├── cartStore.test.ts
│   ├── currency.test.ts
│   ├── dates.test.ts
│   └── schemas.test.ts
├── test/                        # setup.ts + utils.tsx (renderWithProviders)
└── mocks/                       # MSW handlers + server
```

## Base de datos

Migraciones en `supabase/migrations/`. Aplicar manualmente en orden vía Supabase SQL Editor (ver `migrations/README.md`).

| # | Archivo | Contenido |
|---|---|---|
| 001 | `001_schema.sql` | Esquema inicial: products, sales, sale_items, purchase_orders, purchase_items, shrinkage |
| 002 | `002_rpc_functions.sql` | RPCs `register_sale`, `register_purchase_order`, `register_shrinkage` y los `void_*` |
| 003 | `003_per_product_margin.sql` | Columna `margin_percent` por producto + auto-cálculo de `sale_price` |
| 004 | `004_maintainers_and_conversions.sql` | Tablas `suppliers`, `units`, `unit_conversions` |
| 005 | `005_shrinkage_voided_at_and_units_delete.sql` | Soft-delete de mermas y unidades |
| 006 | `006_stock_adjustments.sql` | Tabla `stock_adjustments` con motivo |
| 007a | `007a_fix_purchase_rpc_units.sql` | Fix: persistir `purchase_unit`, `conversion_factor`, `base_qty` |
| 007b | `007b_roles_app_metadata.sql` | Migración de `user_metadata` → `app_metadata` para RLS |
| 008 | `008_fix_security_definer.sql` | Hardening de `SECURITY DEFINER` en RPCs |
| 009 | `009_stock_lots.sql` | **Lotes FIFO**: `stock_lots`, `lot_consumptions`, `consume_lots_fifo()` |
| 010 | `010_multi_location.sql` | **Multi-local**: `locations`, `location_stock`, `stock_transfers` |
| 011 | `011_rpcs_multi_location.sql` | RPCs adaptadas a `location_id` + `transfer_stock` |
| 012 | `012_indexes_and_consistency.sql` | Índices (`pg_trgm` para name, partial por `voided=false`), fix policy `unit_conversions` (`app_metadata`), hardening `register_purchase_order` rechaza `location_id` NULL |

### Tablas principales

- **products**: catálogo. `stock` global = `SUM(location_stock)`. `margin_percent` individual.
- **sales** / **sale_items**: ventas con items. `voided` para soft-delete.
- **purchase_orders** / **purchase_items**: compras. `purchase_items` guarda `purchase_unit`, `conversion_factor`, `base_qty` (la cantidad real en unidad base).
- **shrinkage**: mermas con `reason` y `estimated_value`.
- **suppliers**, **units**, **unit_conversions** (por producto).
- **stock_lots**: lotes con `qty_received`, `qty_remaining`, `unit_cost`, `received_at`. Fuente de verdad para FIFO.
- **lot_consumptions**: cuánto consumió cada venta/merma de cada lote → permite costo real.
- **locations**: bodegas/tiendas.
- **location_stock**: `(product_id, location_id) → qty`.
- **stock_transfers**: registro de transferencias entre locations.
- **stock_adjustments**: ajustes manuales con `reason`.

### RPCs vigentes (todas `SECURITY DEFINER` y atómicas)

| RPC | Firma JSONB | Notas |
|---|---|---|
| `register_purchase_order(order_data jsonb)` | `{ supplier_id, buyer_name, date, has_invoice, invoice_number, comments, location_id, items[] }` | Crea orden + items + lotes (`stock_lots`) + actualiza `location_stock`. **Rechaza `location_id IS NULL`** desde 012. Recalcula `sale_price = ceil(cost / (1 - margin/100))` por producto. Persiste `purchase_unit`, `conversion_factor`, `base_qty`. |
| `void_purchase_order(p_order_id uuid)` | — | Reversa stock por `COALESCE(base_qty, qty)`. |
| `register_sale(sale_data jsonb)` | `{ cashier_name, items[], discount, discount_type, payment_method, cash_received, cash_change, location_id }` | Consume lotes FIFO via `consume_lots_fifo()`, calcula `cost_total` real, actualiza `location_stock`. |
| `void_sale(p_sale_id uuid)` | — | Devuelve qty a los lotes consumidos. |
| `register_shrinkage(shrinkage_data jsonb)` | `{ items[], reason, notes, location_id }` | También consume lotes FIFO para `estimated_value` real. |
| `void_shrinkage(p_shrinkage_id uuid)` | — | Reversa. |
| `transfer_stock(transfer_data jsonb)` | `{ from_location_id, to_location_id, product_id, qty, transferred_by, notes }` | Mueve `qty` entre `location_stock` rows; los lotes son globales. |

## Patrones clave

### Sistema FIFO de lotes (migración 009)

Cada compra crea un row en `stock_lots` con `qty_received` y `unit_cost`. Las ventas/mermas consumen los lotes por orden de antigüedad mediante `consume_lots_fifo(product_id, qty_needed)`, que decrementa `stock_lots.qty_remaining` y registra cada chunk en `lot_consumptions`. Esto permite que `sale_items.cost_total` refleje el costo real ponderado por lote, no un promedio plano.

### Multi-local (migraciones 010-011)

`products.stock` es la suma de `location_stock` para todas las ubicaciones. Todas las RPCs (`register_*`) reciben `location_id` y operan sobre el row específico de `location_stock`. Los **lotes son globales por producto** (no por location); las transferencias mueven cantidad sin tocar lotes.

`useLocationStore` (Zustand persist) mantiene `activeLocationId`. `LocationSelector` lo cambia desde el header.

### Realtime centralizado

`QueryProvider.tsx` monta un único `RealtimeBridge` que abre **un solo canal** `global-realtime` con suscripciones a `products` y `location_stock`, e invalida los queryKeys correspondientes. Esto evita el patrón anterior de N canales con sufijo random por instancia de hook.

### React Query

- `staleTime: 30_000`, `retry: 1` por defecto
- Filtros van al `queryKey` para cache correcto
- Mutaciones invalidan los queryKeys afectados en `onSuccess`

### Zod + React Hook Form

- Schemas en `src/lib/schemas.ts`
- `purchaseOrderSchema` se valida en `PurchaseForm.handleSubmit` con `safeParse` antes de invocar la RPC
- `productSchema` con `zodResolver` en `ProductFormModal`

### Auto-cálculo de precio

`sale_price = ceil(cost_price / (1 - margin_percent/100))`. Se aplica:
- En el RPC `register_purchase_order` cuando llega una compra (recálculo en backend)
- En `useUpdateProduct`/`ProductFormModal` cuando el usuario edita `cost_price` o `margin_percent`

### Conversión de unidades en compras

`PurchaseForm` permite seleccionar `purchase_unit` distinto a la unidad base del producto + un `conversion_factor`. Ej: comprar 2 cajas con factor 18 → `base_qty = 36 kg` se carga al stock. Las conversiones se cachean en `unit_conversions` por producto y se sugieren en futuras compras.

### Filtros de fecha y timezone

`useSales` y `usePurchases` aceptan `from`/`to` en formato `YYYY-MM-DD` (timezone local Chile). Internamente se convierten con `new Date(\`${from}T00:00:00\`).toISOString()` para enviar a Supabase en UTC correcto.

### Hooks con parámetros

```ts
useProducts(category?: ProductCategory | null, search?: string, showInactive = false)
useAllProducts()                                              // sin filtro de active
useSales({ from?, to?, limit = 100 })
usePurchaseOrders({ from?, to?, supplierId?, limit? })
useShrinkage({ from?, to?, limit? })
useDashboard({ range: 'today' | '7d' | '30d' | 'custom', from?, to? })
useStockTransfers(limit = 50)                                 // tipa con StockTransferWithLocations
useLocationStock(productId?)
usePriorCostPrices(productIds[], beforeTimestamp)             // batch para badge de variación
fetchPurchaseItems(orderId): Promise<PurchaseItem[]>          // imperativo
useDebounce<T>(value: T, delay: number): T
```

## Convenciones

- UI 100% en español (Chile)
- Moneda: pesos chilenos (CLP) con `formatCLP()`
- Fechas: `date-fns` locale español
- CSS: Tailwind con paleta custom `primary` (verde)
- Componentes: function components, sin clases
- Path alias: `@/` = `./src/`
- Roles guardados en `app_metadata.role` (no `user_metadata`)
- `app_metadata` se lee desde `auth.jwt()->'app_metadata'->>'role'` en políticas RLS

## Testing

Estructura:

```
src/__tests__/
├── components/                  # @testing-library/react
│   ├── Button.test.tsx
│   ├── Modal.test.tsx
│   └── Spinner.test.tsx
├── hooks/                       # renderHook + MSW
│   ├── useProducts.test.tsx
│   ├── useSales.test.tsx
│   ├── useStockTransfers.test.tsx
│   └── useDashboard.test.tsx
├── cartStore.test.ts
├── currency.test.ts
├── dates.test.ts
└── schemas.test.ts

src/test/
├── setup.ts                     # MSW server start/reset/close
└── utils.tsx                    # createTestQueryClient + renderWithProviders

src/mocks/
├── handlers.ts                  # Handlers globales por defecto
└── server.ts                    # setupServer
```

### Cómo agregar tests de hooks

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/utils'

function wrapper({ children }) {
  const client = createTestQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

it('hace algo', async () => {
  server.use(http.get('http://localhost:54321/rest/v1/foo', () => HttpResponse.json([])))
  const { result } = renderHook(() => useFoo(), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})
```

`vitest.config.ts` define las env vars `VITE_SUPABASE_URL=http://localhost:54321` y `VITE_SUPABASE_ANON_KEY=test-anon-key` para que `lib/supabase.ts` cargue durante los tests.

Cada test es independiente — sin `beforeEach` global; usar `server.use()` para overrides puntuales (los handlers se resetean automáticamente entre tests).
