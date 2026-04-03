# CLAUDE.md — Dos Huertos

## Proyecto
App de gestión para verdulería/frutería "Dos Huertos". Maneja compras a proveedores, punto de venta, inventario con conversión de unidades, control de mermas, ajustes de stock y transferencias entre ubicaciones.

## Comandos

```bash
npm install              # Instalar dependencias
npm run dev              # Servidor de desarrollo (Vite)
npm run build            # TypeScript check + build producción (tsc -b && vite build)
npm run preview          # Preview del build local
npm run lint             # ESLint
npm test                 # Vitest en modo watch
npm run test:coverage    # Tests con reporte de cobertura
```

## Stack
- **Frontend**: React 18, Vite, TypeScript strict, Tailwind CSS v3
- **Backend**: Supabase (Auth + PostgreSQL + Realtime + RLS)
- **Estado**: Zustand (auth, cart, location), React Query (server state)
- **Forms**: React Hook Form + Zod
- **Deploy**: Vercel (auto-deploy desde main)
- **Iconos**: lucide-react
- **Charts**: recharts
- **Tests**: Vitest + jsdom + MSW (Mock Service Worker)

## Arquitectura

### Rutas y roles
| Ruta | Roles permitidos |
|------|-----------------|
| `/` (dashboard) | admin |
| `/pos` | cashier, admin |
| `/purchases` | buyer, admin |
| `/inventory` | admin, buyer |
| `/shrinkage` | todos |
| `/transfers` | buyer, admin |
| `/maintainers` | admin |

### Estructura de archivos
- `src/pages/` — una página por ruta, lazy-loadable
- `src/components/{feature}/` — componentes agrupados por dominio
- `src/components/shared/` — Button, Modal, Toast, SearchInput, SortableHeader, EmptyState, CategoryChips, StockBadge, SyncIndicator, LocationSelector
- `src/hooks/` — un hook por entidad (ver detalle abajo)
- `src/store/` — Zustand stores (authStore, cartStore, locationStore)
- `src/lib/types.ts` — todas las interfaces TypeScript
- `src/lib/schemas.ts` — todos los schemas Zod
- `src/lib/constants.ts` — categorías, métodos de pago, razones de merma, unidades fallback
- `src/lib/supabase.ts` — cliente Supabase
- `src/__tests__/` — tests unitarios (cartStore, currency, dates, schemas)
- `src/mocks/` — handlers MSW + server setup para tests

### Hooks disponibles

#### Productos
- `useProducts` — lista con filtros, Realtime subscription
- `useAllProducts` — todos los productos sin filtro
- `useCreateProduct`, `useUpdateProduct`, `useToggleProduct`

#### Ventas
- `useSales({ from?, to?, limit? })` — lista con filtros opcionales
- `useSaleItems(saleId)` — ítems de una venta
- `useCreateSale`, `useVoidSale`

#### Compras
- `usePurchaseOrders({ from?, to?, supplierId?, limit? })` — lista con filtros opcionales
- `fetchPurchaseItems(orderId): Promise<PurchaseItem[]>` — acción imperativa (no React Query)
- `useCreatePurchaseOrder`, `useVoidPurchaseOrder`
- `usePriorCostPrices(productIds[], beforeTimestamp): Record<productId, costPrice>` — batch de precios anteriores por orden

#### Mermas
- `useShrinkageList` — lista de mermas
- `useCreateShrinkage`, `useVoidShrinkage`

#### Inventario y stock
- `useStockAdjustment` / `useAdjustStock` — ajuste manual de stock
- `useLocationStock(locationId)` — stock en una ubicación
- `useProductLocationStock(productId, locationId)` — stock de un producto en una ubicación
- `useAllLocationStock` — stock en todas las ubicaciones

#### Transferencias
- `useStockTransfers` — historial de transferencias
- `useTransferStock` — ejecutar transferencia entre ubicaciones

#### Proveedores
- `useSuppliers` — lista de proveedores
- `useCreateSupplier`, `useUpdateSupplier`, `useToggleSupplier`

#### Unidades
- `useUnits`, `useAllUnits` — unidades de medida
- `useCreateUnit`, `useUpdateUnit`, `useToggleUnit`

#### Conversiones de unidades
- `useUnitConversions` — conversiones globales
- `useProductConversions(productId)` — conversiones de un producto
- `useCreateConversion`, `useDeleteConversion`

#### Ubicaciones
- `useLocations`, `useAllLocations`
- `useCreateLocation`, `useUpdateLocation`, `useToggleLocationActive`

#### Otros
- `usePriceHistory` — historial de costos de un producto
- `useDashboard` — KPIs, gráficos, alertas de stock
- `useSortable` — sorting genérico para tablas
- `useDebounce` — debounce genérico

### Base de datos

#### Migraciones en `supabase/migrations/` — ejecutar en orden
| Archivo | Descripción |
|---------|-------------|
| `001_schema.sql` | Schema base |
| `002_rpc_functions.sql` | RPCs iniciales |
| `003_per_product_margin.sql` | Margen individual por producto |
| `004_maintainers_and_conversions.sql` | Tablas units y unit_conversions |
| `005_shrinkage_voided_at_and_units_delete.sql` | Soft delete en mermas y unidades |
| `006_stock_adjustments.sql` | Tabla stock_adjustments + RPC adjust_stock |
| `007_fix_purchase_rpc_units.sql` | Fix en RPC de compras para unidades |
| `007_roles_app_metadata.sql` | Roles desde app_metadata |
| `008_fix_security_definer.sql` | Fix permisos SECURITY DEFINER |
| `009_stock_lots.sql` | Tabla stock_lots para FIFO |
| `010_multi_location.sql` | Tablas locations, location_stock, stock_transfers |
| `011_rpcs_multi_location.sql` | RPCs actualizados para multi-ubicación |

#### Tablas principales
- `products`, `suppliers`, `sales`, `sale_items`
- `purchase_orders`, `purchase_items`
- `shrinkage_records`
- `units`, `unit_conversions`
- `stock_adjustments` — historial de ajustes manuales
- `stock_lots` — lotes para consumo FIFO
- `locations` — ubicaciones físicas (bodega, local, etc.)
- `location_stock` — stock por producto por ubicación
- `stock_transfers` — historial de transferencias entre ubicaciones

#### Funciones RPC atómicas (SECURITY DEFINER)
- `register_purchase_order` / `void_purchase_order`
- `register_sale` / `void_sale`
- `register_shrinkage` / `void_shrinkage`
- `adjust_stock` — ajuste manual de stock con registro de auditoría
- `transfer_stock` — transferencia atómica entre ubicaciones
- `consume_lots_fifo` — consumo de stock por orden FIFO

#### Detalles RLS y RPCs
- RLS por rol usando `auth.jwt()->'user_metadata'->>'role'`
- `register_purchase_order` persiste `purchase_unit`, `conversion_factor` y `base_qty` en `purchase_items`, incrementa stock por `base_qty` (unidad base real), y recalcula `sale_price = ceil(cost / (1 - margin_percent/100))` usando el margen individual del producto
- `void_purchase_order` revierte stock usando `COALESCE(base_qty, qty)` para compatibilidad con registros anteriores

### Patrones clave
- Las operaciones de stock son atómicas via funciones RPC (SECURITY DEFINER)
- Productos tienen `margin_percent` individual; al comprar se auto-calcula `sale_price = ceil(cost / (1 - margin/100))`
- Compras soportan `purchase_unit` + `conversion_factor` para convertir ej: 2 cajas → 36 kg. El stock sube por `base_qty`, no por `qty`
- Unidades se gestionan desde tabla `units` (reemplaza constante hardcoded)
- Conversiones guardadas en `unit_conversions` por producto
- Multi-ubicación: el stock se trackea por ubicación en `location_stock`; `locationStore` (Zustand) guarda la ubicación activa de la sesión
- Queries usan React Query con `staleTime: 30_000` y `retry: 1`
- Realtime subscription en productos para sync automático
- `useSortable` hook genérico para sorting en cualquier tabla
- Filtros de fecha en ventas y compras usan `new Date(localDate).toISOString()` para convertir correctamente desde timezone local (Chile) a UTC antes de enviar a Supabase

## Convenciones
- UI en español
- Moneda: pesos chilenos (CLP) formateados con `formatCLP()`
- Fechas: `date-fns` con locale español
- CSS: Tailwind con paleta custom `primary` (verde)
- Componentes: functional components, sin class components
- Path alias: `@/` = `./src/`
- Tests: `describe/it/expect` de Vitest, sin `beforeEach` global — cada test es independiente
- **Antes de hacer merge a `main`, actualizar este CLAUDE.md** para reflejar cualquier cambio en rutas, hooks, migraciones, RPCs, componentes o tablas de BD
