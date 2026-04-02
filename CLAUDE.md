# CLAUDE.md — Dos Huertos

## Proyecto
App de gestión para verdulería/frutería "Dos Huertos". Maneja compras a proveedores, punto de venta, inventario con conversión de unidades, y control de mermas.

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
- **Estado**: Zustand (auth, cart), React Query (server state)
- **Forms**: React Hook Form + Zod
- **Deploy**: Vercel (auto-deploy desde main)
- **Iconos**: lucide-react
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
| `/maintainers` | admin |

### Estructura de archivos
- `src/pages/` — una página por ruta, lazy-loadable
- `src/components/{feature}/` — componentes agrupados por dominio
- `src/components/shared/` — Button, Modal, Toast, SearchInput, SortableHeader, EmptyState
- `src/hooks/` — un hook por entidad:
  - `useProducts`, `useSales`, `usePurchases`, `useShrinkage`
  - `useSuppliers`, `useUnits`, `useUnitConversions`
  - `usePriceHistory` — historial de costos + `usePriorCostPrices` (batch por orden)
  - `useDashboard` — KPIs, gráficos, alertas de stock
  - `useSortable` — sorting genérico para tablas
- `src/store/` — Zustand stores (authStore, cartStore)
- `src/lib/types.ts` — todas las interfaces TypeScript
- `src/lib/schemas.ts` — todos los schemas Zod
- `src/lib/constants.ts` — categorías, métodos de pago, razones de merma, unidades fallback
- `src/lib/supabase.ts` — cliente Supabase
- `src/__tests__/` — tests unitarios (cartStore, currency, dates, schemas)
- `src/mocks/` — handlers MSW + server setup para tests

### Base de datos
- Migraciones en `supabase/migrations/` (001, 002, 003, 004, 007), ejecutar en orden
- Funciones RPC atómicas: `register_purchase_order`, `register_sale`, `register_shrinkage` + sus void
- RLS por rol usando `auth.jwt()->'user_metadata'->>'role'`
- `register_purchase_order` persiste `purchase_unit`, `conversion_factor` y `base_qty` en `purchase_items`, incrementa stock por `base_qty` (unidad base real), y recalcula `sale_price = ceil(cost / (1 - margin_percent/100))` usando el margen individual del producto
- `void_purchase_order` revierte stock usando `COALESCE(base_qty, qty)` para compatibilidad con registros anteriores

### Patrones clave
- Las operaciones de stock son atómicas via funciones RPC (SECURITY DEFINER)
- Productos tienen `margin_percent` individual; al comprar se auto-calcula `sale_price = ceil(cost / (1 - margin/100))`
- Compras soportan `purchase_unit` + `conversion_factor` para convertir ej: 2 cajas → 36 kg. El stock sube por `base_qty`, no por `qty`
- Unidades se gestionan desde tabla `units` (reemplaza constante hardcoded)
- Conversiones guardadas en `unit_conversions` por producto
- Queries usan React Query con `staleTime: 30_000` y `retry: 1`
- Realtime subscription en productos para sync automático
- `useSortable` hook genérico para sorting en cualquier tabla
- Filtros de fecha en ventas y compras usan `new Date(localDate).toISOString()` para convertir correctamente desde timezone local (Chile) a UTC antes de enviar a Supabase

### Hooks con parámetros de filtro

```ts
// Filtros opcionales — sin parámetros devuelve los últimos 100 registros
usePurchaseOrders({ from?, to?, supplierId?, limit? })
useSales({ from?, to?, limit? })

// Acción imperativa (no React Query) para pre-cargar ítems de una orden
fetchPurchaseItems(orderId): Promise<PurchaseItem[]>

// Badge de variación de precio — una query batch para todos los ítems de una orden
usePriorCostPrices(productIds[], beforeTimestamp): Record<productId, costPrice>
```

## Convenciones
- UI en español
- Moneda: pesos chilenos (CLP) formateados con `formatCLP()`
- Fechas: `date-fns` con locale español
- CSS: Tailwind con paleta custom `primary` (verde)
- Componentes: functional components, sin class components
- Path alias: `@/` = `./src/`
- Tests: `describe/it/expect` de Vitest, sin `beforeEach` global — cada test es independiente
