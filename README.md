# Dos Huertos — Sistema de Gesti\u00f3n

App de gesti\u00f3n para verdurer\u00eda/fruter\u00eda. Compras, POS, inventario, mermas y mantenedores.

## Setup r\u00e1pido

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

1. `supabase/migrations/001_schema.sql` \u2014 tablas, RLS, \u00edndices
2. `supabase/migrations/002_rpc_functions.sql` \u2014 funciones at\u00f3micas (register_sale, register_purchase_order, etc.)
3. `supabase/seed.sql` \u2014 124 productos + 5 proveedores
4. `supabase/migrations/003_per_product_margin.sql` \u2014 margen por producto, RPC actualizado con conversi\u00f3n de unidades
5. `supabase/migrations/004_maintainers_and_conversions.sql` \u2014 tabla unidades, conversiones, extensi\u00f3n proveedores

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
- React Hook Form + Zod (validaci\u00f3n)
- Desplegado en Vercel

## Funcionalidades

### POS (Cajero / Admin)
- B\u00fasqueda de productos en tiempo real
- Carrito con validaci\u00f3n de stock
- Descuentos (porcentaje o monto fijo)
- Checkout con efectivo, tarjeta o transferencia
- C\u00e1lculo de vuelto

### Compras (Comprador / Admin)
- Cat\u00e1logo de productos con filtro por categor\u00eda
- Orden de compra con proveedor, factura y comentarios
- **Conversi\u00f3n de unidades**: comprar en caja y convertir a kg autom\u00e1ticamente
- Conversiones guardables por producto (ej: 1 caja tomates = 18 kg)
- Historial de \u00f3rdenes con detalle y anulaci\u00f3n

### Inventario (Admin / Comprador)
- CRUD de productos con categor\u00edas (Frutas, Verduras, Otros, Insumos)
- **Margen % editable por producto** (auto-calcula precio de venta)
- **Sorting** clickable en todas las columnas
- **Toggle de productos inactivos** (visibles con opacidad reducida)
- Badges de stock (rojo/amarillo/verde) y margen
- Suscripci\u00f3n Realtime a cambios

### Mermas (Todos los roles)
- Registro de mermas por producto con raz\u00f3n (vencimiento, da\u00f1o, error, robo, otro)
- Validaci\u00f3n de stock disponible
- Valor estimado de p\u00e9rdida
- Historial con anulaci\u00f3n

### Mantenedores (Solo Admin)
- **Proveedores**: CRUD completo (nombre, contacto, tel\u00e9fono, email, direcci\u00f3n, notas, activo/inactivo)
- **Unidades**: CRUD de unidades de medida (kg, caja, atado, etc.)

### Autenticaci\u00f3n
- Login con email/password v\u00eda Supabase Auth
- 3 roles: admin (acceso total), buyer (compras + inventario), cashier (POS + mermas)
- Control de acceso por ruta y por pol\u00edticas RLS en base de datos

## Estructura

```
src/
  pages/        \u2192 Login, POS, Purchases, Inventory, Shrinkage, Maintainers, NotFound
  components/   \u2192 layout/, pos/, purchases/, inventory/, shrinkage/, maintainers/, shared/
  hooks/        \u2192 useProducts, usePurchases, useSales, useShrinkage, useSuppliers,
                  useUnits, useUnitConversions, useSortable
  store/        \u2192 authStore, cartStore
  lib/          \u2192 supabase, types, schemas, constants
  utils/        \u2192 currency, dates, cn
supabase/
  migrations/   \u2192 001_schema, 002_rpc_functions, 003_per_product_margin,
                  004_maintainers_and_conversions
  seed.sql      \u2192 124 productos + 5 proveedores
```

## Base de datos

### Tablas principales
| Tabla | Descripci\u00f3n |
|-------|------------|
| `products` | Cat\u00e1logo de productos con stock, precios y margen |
| `suppliers` | Proveedores con datos de contacto |
| `units` | Unidades de medida configurables |
| `unit_conversions` | Conversiones por producto (ej: 1 caja = 18 kg) |
| `purchase_orders` | \u00d3rdenes de compra |
| `purchase_items` | L\u00edneas de compra (con conversi\u00f3n de unidad) |
| `sales` | Ventas |
| `sale_items` | L\u00edneas de venta |
| `shrinkage` | Registros de merma |
| `price_history` | Historial de cambios de precio |

### Funciones RPC (at\u00f3micas)
- `register_purchase_order` \u2014 crea orden, actualiza stock (con conversi\u00f3n), ajusta precios seg\u00fan margen
- `void_purchase_order` \u2014 anula orden y revierte stock
- `register_sale` \u2014 valida stock, crea venta, descuenta stock
- `void_sale` \u2014 anula venta y restaura stock
- `register_shrinkage` \u2014 registra merma y descuenta stock
- `void_shrinkage` \u2014 anula merma y restaura stock

## Deploy

La app se despliega autom\u00e1ticamente en **Vercel** al hacer push a `main`.

Variables de entorno requeridas en Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
