# Dos Huertos — Sistema de Gestión

App de gestión para verdulería/frutería. Compras, POS, inventario y mermas.

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
2. `supabase/migrations/002_rpc_functions.sql` — funciones atómicas
3. `supabase/seed.sql` — 124 productos + proveedores

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

## Estructura

```
src/
  pages/        → Login, POS, Purchases, Inventory, Shrinkage
  components/   → layout/, pos/, purchases/, inventory/, shrinkage/, shared/
  hooks/        → useProducts, usePurchases, useSales, useShrinkage, useSuppliers
  store/        → authStore, cartStore
  lib/          → supabase, types, schemas, constants
  utils/        → currency, dates, cn
supabase/
  migrations/   → SQL schema + funciones RPC
  seed.sql      → datos iniciales
```
