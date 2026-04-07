# Migraciones — Dos Huertos

Las migraciones se ejecutan **manualmente** en el SQL Editor de Supabase, en el orden indicado abajo. No usamos `supabase db push` automatizado en este repo.

## Orden de aplicación

| # | Archivo | Propósito |
|---|---|---|
| 001 | `001_schema.sql` | Schema inicial: products, suppliers, purchase_orders/items, sales/items, shrinkage, price_history. RLS base. |
| 002 | `002_rpc_functions.sql` | RPCs base: register_/void_ (purchase_order, sale, shrinkage). |
| 003 | `003_per_product_margin.sql` | Columna `margin_percent` en products + RPCs reescritos para auto-calcular `sale_price`. |
| 004 | `004_maintainers_and_conversions.sql` | Tablas `units` + `unit_conversions`. Columnas `purchase_unit`/`conversion_factor`/`base_qty` en `purchase_items`. |
| 005 | `005_shrinkage_voided_at_and_units_delete.sql` | Columna `voided_at` en shrinkage + DELETE policy en units. |
| 006 | `006_stock_adjustments.sql` | Tabla `stock_adjustments` + RPC `adjust_stock`. |
| **007a** | `007a_fix_purchase_rpc_units.sql` | **Aplicar primero** — corrige conversión qty↔base_qty en `register_purchase_order` y `void_purchase_order`. |
| **007b** | `007b_roles_app_metadata.sql` | **Aplicar después** — migra todas las RLS de `user_metadata` a `app_metadata`. |
| 008 | `008_fix_security_definer.sql` | Hardening: agrega `SET search_path` a todos los RPCs SECURITY DEFINER + REVOKE/GRANT explícitos + checks de rol en `void_*`. |
| 009 | `009_stock_lots.sql` | Sistema FIFO de lotes: tablas `stock_lots` + `lot_consumptions`, helper `consume_lots_fifo()`, reescritura de RPCs, migración retroactiva de datos históricos. |
| 010 | `010_multi_location.sql` | Multi-local: tablas `locations` + `location_stock` + `stock_transfers`. RPC `transfer_stock`. Backfill de stock histórico al local "Principal". |
| 011 | `011_rpcs_multi_location.sql` | Reescribe TODOS los RPCs para soportar `location_id` (compras, ventas, mermas, ajustes). |
| 012 | `012_indexes_and_consistency.sql` | Índices para búsqueda por nombre y filtros por fecha + fix policy `unit_conversions` (user_metadata → app_metadata) + `register_purchase_order` requiere `location_id` NOT NULL. |

## Notas importantes

### Sobre las migraciones 007a y 007b
Originalmente ambas tenían el prefijo `007_` (orden ambiguo). En este repo se renombraron a `007a_*` y `007b_*` para forzar el orden correcto. Si las aplicaste con los nombres viejos en producción, **no las re-ejecutes** — el rename es solo organizativo en el repo.

### Sobre `register_purchase_order` en 012
A partir de 012, registrar una compra sin `location_id` lanza `EXCEPTION`. Esto es seguro porque el frontend (`PurchaseForm.tsx`) ya envía `activeLocationId` desde el `locationStore`. Si tenés clientes externos que llaman este RPC, asegurate de que pasen `location_id`.

### Sobre `pg_trgm`
La migración 012 crea el índice GIN `idx_products_name_trgm` que requiere la extensión `pg_trgm`. Está habilitada por defecto en Supabase, pero la migración hace `CREATE EXTENSION IF NOT EXISTS` para mayor seguridad.

## Cómo aplicar una nueva migración

1. Abrí el SQL Editor de Supabase
2. Pegá el contenido del archivo `.sql`
3. Ejecutá
4. Verificá en el panel de Tablas/Funciones que los cambios estén aplicados
5. Anotá en este README el número y propósito
