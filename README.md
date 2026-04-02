# Dos Huertos — Sistema de Gestión

App de gestión para verdulería/frutería. Compras, POS, inventario, mermas y mantenedores.

## Setup rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

Crear `.env.local` con las credenciales de tu proyecto Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Crear base de datos

En el SQL Editor de Supabase, ejecutar en este orden:

1. `supabase/migrations/001_schema.sql` — tablas, RLS, índices
2. `supabase/migrations/002_rpc_functions.sql` — funciones atómicas base
3. `supabase/seed.sql` — 124 productos + 5 proveedores
4. `supabase/migrations/003_per_product_margin.sql` — margen por producto
5. `supabase/migrations/004_maintainers_and_conversions.sql` — tabla unidades, conversiones, extensión proveedores
6. `supabase/migrations/007_fix_purchase_rpc_units.sql` — corrige stock con conversión de unidades (base_qty) y sale_price por margen individual

> Las migraciones 005 y 006 corresponden a ajustes de esquema internos aplicados en el proyecto original. Si partes desde cero, ejecuta solo las indicadas arriba.

### 4. Crear usuarios

En Supabase Dashboard > Authentication > Users, crear usuarios con:

| Email | Rol (en user_metadata) |
|-------|----------------------|
| admin@doshuertos.cl | `{"role": "admin"}` |
| comprador@doshuertos.cl | `{"role": "buyer"}` |
| caja@doshuertos.cl | `{"role": "cashier"}` |

### 5. Levantar

```bash
npm run dev
```

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS v3
- Supabase (Auth + PostgreSQL + Realtime)
- Zustand (estado local)
- React Query (sync servidor)
- React Hook Form + Zod (validación)
- Desplegado en Vercel
- **Tests**: Vitest + jsdom + MSW

## Funcionalidades

### POS (Cajero / Admin)
- Búsqueda de productos en tiempo real
- Carrito con validación de stock
- Descuentos (porcentaje o monto fijo)
- Checkout con efectivo, tarjeta o transferencia
- Cálculo de vuelto
- **Historial de ventas** con filtro por fecha, detalle de ítems y anulación (admin)

### Compras (Comprador / Admin)
- Catálogo de productos con filtro por categoría
- Orden de compra con proveedor, factura y comentarios
- **Conversión de unidades**: comprar en caja y convertir a kg automáticamente
- Conversiones guardables por producto (ej: 1 caja tomates = 18 kg)
- **Repetir última orden**: pre-llena formulario con productos y proveedor de una orden anterior
- Historial con **filtros por fecha y proveedor**
- **Badge de variación de precio** (↑↓%) al expandir una orden

### Inventario (Admin / Comprador)
- CRUD de productos con categorías (Frutas, Verduras, Otros, Insumos)
- **Margen % editable por producto** (auto-calcula precio de venta)
- **Sorting** clickable en todas las columnas
- **Toggle de productos inactivos** (visibles con opacidad reducida)
- Badges de stock (rojo/amarillo/verde) y margen
- Suscripción Realtime a cambios

### Mermas (Todos los roles)
- Registro de mermas por producto con razón (vencimiento, daño, error, robo, otro)
- Validación de stock disponible
- Valor estimado de pérdida
- Historial con anulación

### Mantenedores (Solo Admin)
- **Proveedores**: CRUD completo (nombre, contacto, teléfono, email, dirección, notas, activo/inactivo)
- **Unidades**: CRUD de unidades de medida (kg, caja, atado, etc.)

### Dashboard (Admin)
- KPIs: ventas hoy, transacciones, ganancia bruta, mermas, compras
- Filtro por período: hoy, 7 días, 30 días, rango personalizado
- Gráfico de barras de ventas diarias
- Top 5 productos, desglose por método de pago, compras por proveedor, mermas por razón
- Alertas de stock bajo y sin stock

### Autenticación
- Login con email/password vía Supabase Auth
- 3 roles: admin (acceso total), buyer (compras + inventario), cashier (POS + mermas)
- Control de acceso por ruta y por políticas RLS en base de datos

## Estructura

```
src/
  pages/        → Login, POS, Purchases, Inventory, Shrinkage, Maintainers, Dashboard, NotFound
  components/
    pos/        → ProductSearch, Cart, CheckoutModal, SalesHistory
    purchases/  → ProductCatalog, PurchaseForm, PurchaseHistory
    inventory/  → componentes de inventario
    shrinkage/  → ShrinkageForm, ShrinkageHistory
    maintainers/→ componentes de mantenedores
    layout/     → AppShell, Navbar, etc.
    shared/     → Button, Modal, Toast, SearchInput, SortableHeader, EmptyState
  hooks/        → useProducts, usePurchases, useSales, useShrinkage, useSuppliers,
                  useUnits, useUnitConversions, usePriceHistory, useDashboard, useSortable
  store/        → authStore, cartStore
  lib/          → supabase, types, schemas, constants
  utils/        → currency, dates, cn
  __tests__/    → cartStore.test.ts, currency.test.ts, dates.test.ts, schemas.test.ts
  mocks/        → handlers.ts (MSW), server.ts
  test/         → setup.ts (vitest global setup)
supabase/
  migrations/   → 001_schema, 002_rpc_functions, 003_per_product_margin,
                  004_maintainers_and_conversions, 007_fix_purchase_rpc_units
  seed.sql      → 124 productos + 5 proveedores
```

## Base de datos

### Tablas principales
| Tabla | Descripción |
|-------|------------|
| `products` | Catálogo de productos con stock, precios y margen |
| `suppliers` | Proveedores con datos de contacto |
| `units` | Unidades de medida configurables |
| `unit_conversions` | Conversiones por producto (ej: 1 caja = 18 kg) |
| `purchase_orders` | Órdenes de compra |
| `purchase_items` | Líneas de compra — incluye `purchase_unit`, `conversion_factor`, `base_qty` |
| `sales` | Ventas |
| `sale_items` | Líneas de venta |
| `shrinkage` | Registros de merma |
| `price_history` | Historial de cambios de precio por compra |

### Funciones RPC (atómicas)
- `register_purchase_order` — crea orden, persiste conversión de unidades, actualiza stock por `base_qty`, recalcula `sale_price` según `margin_percent` del producto
- `void_purchase_order` — anula orden y revierte stock usando `base_qty`
- `register_sale` — valida stock, crea venta, descuenta stock
- `void_sale` — anula venta y restaura stock
- `register_shrinkage` — registra merma y descuenta stock
- `void_shrinkage` — anula merma y restaura stock

## Tests

```bash
npm test                # Vitest en modo watch
npm run test:coverage   # Con reporte de cobertura (lcov)
```

40 tests distribuidos en:
- `cartStore.test.ts` — lógica completa del carrito (addItem, updateQty, descuentos, totales)
- `currency.test.ts` — formatCLP para distintos valores
- `dates.test.ts` — formatDate, formatDateTime, toInputDate
- `schemas.test.ts` — purchaseLineSchema, productSchema, shrinkageSchema con casos de borde

MSW intercepta llamadas a Supabase en tests de integración.

## Deploy

La app se despliega automáticamente en **Vercel** al hacer push a `main`.

Variables de entorno requeridas en Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
