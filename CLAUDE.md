# CLAUDE.md — Dos Huertos

## Proyecto
App de gesti\u00f3n para verdurer\u00eda/fruter\u00eda "Dos Huertos". Maneja compras a proveedores, punto de venta, inventario con conversi\u00f3n de unidades, y control de mermas.

## Comandos

```bash
npm install        # Instalar dependencias
npm run dev        # Servidor de desarrollo (Vite)
npm run build      # TypeScript check + build producci\u00f3n (tsc -b && vite build)
npm run preview    # Preview del build local
npm run lint       # ESLint
```

## Stack
- **Frontend**: React 18, Vite, TypeScript strict, Tailwind CSS v3
- **Backend**: Supabase (Auth + PostgreSQL + Realtime + RLS)
- **Estado**: Zustand (auth, cart), React Query (server state)
- **Forms**: React Hook Form + Zod
- **Deploy**: Vercel (auto-deploy desde main)
- **Iconos**: lucide-react

## Arquitectura

### Rutas y roles
| Ruta | Roles permitidos |
|------|-----------------|
| `/pos` | cashier, admin |
| `/purchases` | buyer, admin |
| `/inventory` | admin, buyer |
| `/shrinkage` | todos |
| `/maintainers` | admin |

### Estructura de archivos
- `src/pages/` \u2014 una p\u00e1gina por ruta, lazy-loadable
- `src/components/{feature}/` \u2014 componentes agrupados por dominio
- `src/components/shared/` \u2014 Button, Modal, Toast, SearchInput, SortableHeader, etc.
- `src/hooks/` \u2014 un hook por entidad (useProducts, useSales, useSuppliers, useUnits, useUnitConversions, useSortable)
- `src/store/` \u2014 Zustand stores (authStore, cartStore)
- `src/lib/types.ts` \u2014 todas las interfaces TypeScript
- `src/lib/schemas.ts` \u2014 todos los schemas Zod
- `src/lib/constants.ts` \u2014 categor\u00edas, m\u00e9todos de pago, razones de merma, unidades fallback
- `src/lib/supabase.ts` \u2014 cliente Supabase

### Base de datos
- Migraciones en `supabase/migrations/` (001 a 004), ejecutar en orden
- Funciones RPC at\u00f3micas: `register_purchase_order`, `register_sale`, `register_shrinkage` + sus void
- RLS por rol usando `auth.jwt()->'user_metadata'->>'role'`
- `register_purchase_order` maneja conversi\u00f3n de unidades (conversion_factor, base_qty) y margen por producto (margin_percent)

### Patrones clave
- Las operaciones de stock son at\u00f3micas via funciones RPC (SECURITY DEFINER)
- Productos tienen `margin_percent` individual; al comprar se auto-calcula `sale_price = ceil(cost / (1 - margin/100))`
- Compras soportan `purchase_unit` + `conversion_factor` para convertir ej: 2 cajas \u2192 40 kg
- Unidades se gestionan desde tabla `units` (reemplaza constante hardcoded)
- Conversiones guardadas en `unit_conversions` por producto
- Queries usan React Query con staleTime 30s y retry 1
- Realtime subscription en productos para sync autom\u00e1tico
- `useSortable` hook gen\u00e9rico para sorting en cualquier tabla

## Convenciones
- UI en espa\u00f1ol
- Moneda: pesos chilenos (CLP) formateados con `formatCLP()`
- Fechas: `date-fns` con locale espa\u00f1ol
- CSS: Tailwind con paleta custom `primary` (verde)
- Componentes: functional components, sin class components
- Path alias: `@/` = `./src/`
