-- Dos Huertos — Migración 012: Índices, consistencia RLS y hardening
-- Ejecutar en Supabase SQL Editor DESPUÉS de 011_rpcs_multi_location.sql
--
-- CAMBIOS:
-- 1. Índices faltantes para queries comunes (búsqueda por nombre, filtros por fecha)
-- 2. unit_conversions: cambiar policy de user_metadata → app_metadata (consistencia 007b)
-- 3. register_purchase_order: validar location_id NOT NULL (rechazar compras sin local)

-- ============================================================
-- 1. ÍNDICES
-- ============================================================

-- Búsqueda por nombre de producto (`ilike '%search%'`)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

-- Filtros temporales en historial (excluyendo anuladas — la mayoría de queries)
CREATE INDEX IF NOT EXISTS idx_sales_date
  ON sales(date DESC) WHERE voided = false;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date
  ON purchase_orders(date DESC) WHERE voided = false;
CREATE INDEX IF NOT EXISTS idx_shrinkage_date
  ON shrinkage(date DESC) WHERE voided = false;

-- Filtros combinados frecuentes
CREATE INDEX IF NOT EXISTS idx_sales_location_date
  ON sales(location_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_date
  ON purchase_orders(supplier_id, date DESC);

-- ============================================================
-- 2. CONSISTENCIA RLS: unit_conversions
-- En 004 las policies usaban user_metadata. 007b migró el resto a
-- app_metadata pero esta tabla quedó afuera.
-- ============================================================

DROP POLICY IF EXISTS "uc_admin_buyer_insert" ON unit_conversions;
DROP POLICY IF EXISTS "uc_admin_buyer_update" ON unit_conversions;
DROP POLICY IF EXISTS "uc_admin_buyer_delete" ON unit_conversions;
DROP POLICY IF EXISTS "uc_admin_buyer_write" ON unit_conversions;

CREATE POLICY "uc_admin_buyer_write" ON unit_conversions
  FOR ALL TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'))
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

-- ============================================================
-- 3. HARDENING: register_purchase_order requiere location_id
-- En 011 si location_id es NULL, location_stock no se actualiza
-- silenciosamente. Mejor fallar explícitamente.
-- ============================================================

CREATE OR REPLACE FUNCTION register_purchase_order(order_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id    UUID;
  v_location_id UUID;
  v_total       NUMERIC := 0;
  item          JSONB;
  v_item_total  NUMERIC;
  v_old_cost    NUMERIC;
  v_margin      NUMERIC;
  v_base_qty    NUMERIC;
  v_conv_factor NUMERIC;
  v_cost_per_u  NUMERIC;
  v_item_id     UUID;
  v_order_date  DATE;
BEGIN
  v_location_id := NULLIF(order_data->>'location_id', '')::UUID;
  v_order_date  := COALESCE((order_data->>'date')::DATE, CURRENT_DATE);

  -- HARDENING 012: location_id es obligatorio
  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'location_id es obligatorio para registrar una compra'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO purchase_orders (
    date, supplier_id, buyer_name, has_invoice, invoice_number, comments, total_cost, location_id
  ) VALUES (
    v_order_date,
    NULLIF(order_data->>'supplier_id', '')::UUID,
    order_data->>'buyer_name',
    COALESCE((order_data->>'has_invoice')::BOOLEAN, false),
    NULLIF(order_data->>'invoice_number', ''),
    NULLIF(order_data->>'comments', ''),
    0,
    v_location_id
  ) RETURNING id INTO v_order_id;

  FOR item IN SELECT * FROM jsonb_array_elements(order_data->'items')
  LOOP
    v_conv_factor := COALESCE((item->>'conversion_factor')::NUMERIC, 1);
    v_base_qty    := (item->>'qty')::NUMERIC * v_conv_factor;
    v_item_total  := (item->>'qty')::NUMERIC * (item->>'cost_price')::NUMERIC;
    v_total       := v_total + v_item_total;
    v_cost_per_u  := ROUND((item->>'cost_price')::NUMERIC / v_conv_factor, 4);

    INSERT INTO purchase_items (
      purchase_order_id, product_id, product_name, qty, unit, cost_price, total_cost,
      purchase_unit, conversion_factor, base_qty
    ) VALUES (
      v_order_id,
      (item->>'product_id')::UUID,
      item->>'product_name',
      (item->>'qty')::NUMERIC,
      item->>'unit',
      (item->>'cost_price')::NUMERIC,
      v_item_total,
      item->>'purchase_unit',
      v_conv_factor,
      v_base_qty
    ) RETURNING id INTO v_item_id;

    -- Lote FIFO
    INSERT INTO stock_lots (
      product_id, source_type, source_id, purchase_item_id,
      qty_initial, qty_remaining, cost_per_unit, lot_date, location_id
    ) VALUES (
      (item->>'product_id')::UUID,
      'purchase',
      v_order_id,
      v_item_id,
      v_base_qty,
      v_base_qty,
      v_cost_per_u,
      v_order_date,
      v_location_id
    );

    -- location_stock (location_id ya garantizado NOT NULL arriba)
    INSERT INTO location_stock (location_id, product_id, qty)
    VALUES (v_location_id, (item->>'product_id')::UUID, v_base_qty)
    ON CONFLICT (location_id, product_id)
    DO UPDATE SET qty = location_stock.qty + v_base_qty, updated_at = now();

    -- Stock global del producto + recálculo de sale_price
    SELECT cost_price, margin_percent INTO v_old_cost, v_margin
    FROM products WHERE id = (item->>'product_id')::UUID;

    UPDATE products
    SET stock      = stock + v_base_qty,
        cost_price = v_cost_per_u,
        sale_price = CASE
          WHEN (item->>'cost_price')::NUMERIC > 0
            AND (item->>'cost_price')::NUMERIC != v_old_cost
          THEN CEIL(v_cost_per_u / (1.0 - COALESCE(v_margin, 20) / 100.0))
          ELSE sale_price
        END
    WHERE id = (item->>'product_id')::UUID;

    IF v_old_cost IS DISTINCT FROM (item->>'cost_price')::NUMERIC
       AND (item->>'cost_price')::NUMERIC > 0 THEN
      INSERT INTO price_history (product_id, cost_price, sale_price, purchase_order_id)
      SELECT id, cost_price, sale_price, v_order_id
      FROM products WHERE id = (item->>'product_id')::UUID;
    END IF;
  END LOOP;

  UPDATE purchase_orders SET total_cost = v_total WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_purchase_order(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION register_purchase_order(JSONB) TO authenticated;
