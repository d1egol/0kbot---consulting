-- Dos Huertos — Migración: RPCs con soporte multi-local
-- Ejecutar en Supabase SQL Editor DESPUÉS de 010_multi_location.sql
--
-- CAMBIOS vs 009:
-- 1. register_purchase_order → agrega stock en location_stock del local receptor
-- 2. void_purchase_order → revierte location_stock además de stock_lots
-- 3. register_sale → verifica y descuenta location_stock del local activo
-- 4. void_sale → restaura location_stock del local donde ocurrió la venta
-- 5. register_shrinkage → verifica y descuenta location_stock
-- 6. void_shrinkage → restaura location_stock
-- 7. adjust_stock → ajusta location_stock del local especificado,
--                   recalcula products.stock como SUM(location_stock)

-- ============================================================
-- FUNCIÓN: register_purchase_order
-- order_data debe incluir location_id (UUID del local receptor)
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

    -- Lote FIFO (global, con location_id para trazabilidad)
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

    -- Actualizar stock por ubicación
    IF v_location_id IS NOT NULL THEN
      INSERT INTO location_stock (location_id, product_id, qty)
      VALUES (v_location_id, (item->>'product_id')::UUID, v_base_qty)
      ON CONFLICT (location_id, product_id)
      DO UPDATE SET qty = location_stock.qty + v_base_qty, updated_at = now();
    END IF;

    -- Actualizar stock global del producto
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

-- ============================================================
-- FUNCIÓN: void_purchase_order
-- Revierte stock_lots + location_stock + products.stock
-- ============================================================
CREATE OR REPLACE FUNCTION void_purchase_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lot         RECORD;
  v_location_id UUID;
BEGIN
  IF (auth.jwt()->'app_metadata'->>'role') != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden anular órdenes de compra'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (SELECT 1 FROM purchase_orders WHERE id = p_order_id AND voided = true) THEN
    RAISE EXCEPTION 'La orden ya está anulada';
  END IF;

  SELECT location_id INTO v_location_id FROM purchase_orders WHERE id = p_order_id;

  -- Revertir solo el stock restante en lotes (lo ya vendido no se toca)
  FOR v_lot IN
    SELECT * FROM stock_lots
    WHERE source_type = 'purchase' AND source_id = p_order_id
      AND qty_remaining > 0
    FOR UPDATE
  LOOP
    -- Revertir stock global
    UPDATE products
    SET stock = stock - v_lot.qty_remaining
    WHERE id = v_lot.product_id;

    -- Revertir location_stock si aplica
    IF v_location_id IS NOT NULL THEN
      UPDATE location_stock
      SET qty = GREATEST(0, qty - v_lot.qty_remaining), updated_at = now()
      WHERE location_id = v_location_id AND product_id = v_lot.product_id;

      -- Limpiar filas vacías
      DELETE FROM location_stock
      WHERE location_id = v_location_id AND product_id = v_lot.product_id AND qty = 0;
    END IF;

    UPDATE stock_lots SET qty_remaining = 0 WHERE id = v_lot.id;
  END LOOP;

  UPDATE purchase_orders
  SET voided = true, voided_at = now()
  WHERE id = p_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION void_purchase_order(UUID) FROM public;
GRANT EXECUTE ON FUNCTION void_purchase_order(UUID) TO authenticated;

-- ============================================================
-- FUNCIÓN: register_sale
-- Verifica stock en location_stock del local activo.
-- Descuenta location_stock + products.stock + consume FIFO.
-- sale_data debe incluir location_id.
-- ============================================================
CREATE OR REPLACE FUNCTION register_sale(sale_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id     UUID;
  v_location_id UUID;
  item          JSONB;
  v_loc_stock   NUMERIC;
  v_glob_stock  NUMERIC;
  v_subtotal    NUMERIC := 0;
  v_discount    NUMERIC;
  v_total       NUMERIC;
  v_item_id     UUID;
  v_cost_total  NUMERIC;
BEGIN
  v_location_id := NULLIF(sale_data->>'location_id', '')::UUID;

  -- Verificar stock para todos los ítems
  FOR item IN SELECT * FROM jsonb_array_elements(sale_data->'items')
  LOOP
    IF v_location_id IS NOT NULL THEN
      -- Verificar stock en la ubicación específica
      SELECT qty INTO v_loc_stock
      FROM location_stock
      WHERE location_id = v_location_id AND product_id = (item->>'product_id')::UUID;

      IF v_loc_stock IS NULL OR v_loc_stock < (item->>'qty')::NUMERIC THEN
        RAISE EXCEPTION 'Stock insuficiente en esta ubicación para %: disponible %, solicitado %',
          item->>'product_name',
          COALESCE(v_loc_stock, 0),
          (item->>'qty')::NUMERIC;
      END IF;
    ELSE
      -- Sin ubicación: verificar stock global (comportamiento legacy)
      SELECT stock INTO v_glob_stock
      FROM products
      WHERE id = (item->>'product_id')::UUID AND active = true;

      IF v_glob_stock IS NULL THEN
        RAISE EXCEPTION 'Producto no encontrado o inactivo: %', item->>'product_name';
      END IF;

      IF v_glob_stock < (item->>'qty')::NUMERIC THEN
        RAISE EXCEPTION 'Stock insuficiente para %: disponible %, solicitado %',
          item->>'product_name', v_glob_stock, (item->>'qty')::NUMERIC;
      END IF;
    END IF;

    v_subtotal := v_subtotal + ((item->>'qty')::NUMERIC * (item->>'unit_price')::NUMERIC);
  END LOOP;

  -- Calcular descuento y total
  v_discount := COALESCE((sale_data->>'discount')::NUMERIC, 0);
  IF sale_data->>'discount_type' = 'percent' THEN
    v_discount := ROUND(v_subtotal * v_discount / 100);
  END IF;
  v_total := v_subtotal - v_discount;

  INSERT INTO sales (
    cashier_name, subtotal, discount, discount_type, total,
    payment_method, cash_received, cash_change, location_id
  ) VALUES (
    sale_data->>'cashier_name',
    v_subtotal,
    v_discount,
    NULLIF(sale_data->>'discount_type', ''),
    v_total,
    sale_data->>'payment_method',
    NULLIF(sale_data->>'cash_received', '')::NUMERIC,
    NULLIF(sale_data->>'cash_change', '')::NUMERIC,
    v_location_id
  ) RETURNING id INTO v_sale_id;

  FOR item IN SELECT * FROM jsonb_array_elements(sale_data->'items')
  LOOP
    INSERT INTO sale_items (
      sale_id, product_id, product_name, qty, unit_price, subtotal
    ) VALUES (
      v_sale_id,
      (item->>'product_id')::UUID,
      item->>'product_name',
      (item->>'qty')::NUMERIC,
      (item->>'unit_price')::NUMERIC,
      (item->>'qty')::NUMERIC * (item->>'unit_price')::NUMERIC
    ) RETURNING id INTO v_item_id;

    -- Consumir lotes FIFO (globales) y guardar costo real
    v_cost_total := consume_lots_fifo(
      (item->>'product_id')::UUID,
      (item->>'qty')::NUMERIC,
      'sale',
      v_sale_id,
      v_item_id
    );

    UPDATE sale_items SET cost_total = v_cost_total WHERE id = v_item_id;

    -- Descontar stock por ubicación
    IF v_location_id IS NOT NULL THEN
      UPDATE location_stock
      SET qty = qty - (item->>'qty')::NUMERIC, updated_at = now()
      WHERE location_id = v_location_id AND product_id = (item->>'product_id')::UUID;

      -- Limpiar filas vacías
      DELETE FROM location_stock
      WHERE location_id = v_location_id AND product_id = (item->>'product_id')::UUID AND qty = 0;
    END IF;

    -- Descontar stock global
    UPDATE products
    SET stock = stock - (item->>'qty')::NUMERIC
    WHERE id = (item->>'product_id')::UUID;
  END LOOP;

  RETURN v_sale_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_sale(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION register_sale(JSONB) TO authenticated;

-- ============================================================
-- FUNCIÓN: void_sale
-- Restaura location_stock + products.stock + stock_lots
-- ============================================================
CREATE OR REPLACE FUNCTION void_sale(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item        RECORD;
  v_cons        RECORD;
  v_location_id UUID;
BEGIN
  IF (auth.jwt()->'app_metadata'->>'role') != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden anular ventas'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND voided = true) THEN
    RAISE EXCEPTION 'La venta ya está anulada';
  END IF;

  SELECT location_id INTO v_location_id FROM sales WHERE id = p_sale_id;

  -- Restaurar lotes FIFO exactamente
  FOR v_cons IN
    SELECT lc.*
    FROM lot_consumptions lc
    WHERE lc.consumed_type = 'sale' AND lc.consumed_id = p_sale_id
  LOOP
    UPDATE stock_lots
    SET qty_remaining = qty_remaining + v_cons.qty
    WHERE id = v_cons.lot_id;
  END LOOP;

  DELETE FROM lot_consumptions
  WHERE consumed_type = 'sale' AND consumed_id = p_sale_id;

  -- Restaurar stock por ítem
  FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE products SET stock = stock + v_item.qty WHERE id = v_item.product_id;

    IF v_location_id IS NOT NULL THEN
      INSERT INTO location_stock (location_id, product_id, qty)
      VALUES (v_location_id, v_item.product_id, v_item.qty)
      ON CONFLICT (location_id, product_id)
      DO UPDATE SET qty = location_stock.qty + v_item.qty, updated_at = now();
    END IF;
  END LOOP;

  UPDATE sales SET voided = true, voided_at = now() WHERE id = p_sale_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION void_sale(UUID) FROM public;
GRANT EXECUTE ON FUNCTION void_sale(UUID) TO authenticated;

-- ============================================================
-- FUNCIÓN: register_shrinkage
-- Verifica y descuenta location_stock + products.stock + FIFO
-- shrinkage_data debe incluir location_id
-- ============================================================
CREATE OR REPLACE FUNCTION register_shrinkage(shrinkage_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id          UUID;
  v_location_id UUID;
  v_loc_stock   NUMERIC;
  v_glob_stock  NUMERIC;
  v_qty         NUMERIC;
  v_cost        NUMERIC;
BEGIN
  v_location_id := NULLIF(shrinkage_data->>'location_id', '')::UUID;
  v_qty := (shrinkage_data->>'qty')::NUMERIC;

  IF v_location_id IS NOT NULL THEN
    SELECT qty INTO v_loc_stock
    FROM location_stock
    WHERE location_id = v_location_id AND product_id = (shrinkage_data->>'product_id')::UUID;

    IF v_loc_stock IS NULL OR v_loc_stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente en esta ubicación: disponible %, solicitado %',
        COALESCE(v_loc_stock, 0), v_qty;
    END IF;
  ELSE
    SELECT stock INTO v_glob_stock FROM products WHERE id = (shrinkage_data->>'product_id')::UUID;
    IF v_glob_stock IS NULL THEN
      RAISE EXCEPTION 'Producto no encontrado';
    END IF;
    IF v_glob_stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', v_glob_stock, v_qty;
    END IF;
  END IF;

  INSERT INTO shrinkage (
    product_id, product_name, qty, unit, reason, notes, date, location_id
  ) VALUES (
    (shrinkage_data->>'product_id')::UUID,
    shrinkage_data->>'product_name',
    v_qty,
    shrinkage_data->>'unit',
    shrinkage_data->>'reason',
    NULLIF(shrinkage_data->>'notes', ''),
    COALESCE(NULLIF(shrinkage_data->>'date', '')::DATE, CURRENT_DATE),
    v_location_id
  ) RETURNING id INTO v_id;

  v_cost := consume_lots_fifo(
    (shrinkage_data->>'product_id')::UUID,
    v_qty,
    'shrinkage',
    v_id,
    v_id
  );

  UPDATE shrinkage
  SET estimated_value = v_cost, cost_total = v_cost
  WHERE id = v_id;

  IF v_location_id IS NOT NULL THEN
    UPDATE location_stock
    SET qty = qty - v_qty, updated_at = now()
    WHERE location_id = v_location_id AND product_id = (shrinkage_data->>'product_id')::UUID;

    DELETE FROM location_stock
    WHERE location_id = v_location_id
      AND product_id = (shrinkage_data->>'product_id')::UUID
      AND qty = 0;
  END IF;

  UPDATE products
  SET stock = stock - v_qty
  WHERE id = (shrinkage_data->>'product_id')::UUID;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_shrinkage(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION register_shrinkage(JSONB) TO authenticated;

-- ============================================================
-- FUNCIÓN: void_shrinkage
-- Restaura location_stock + products.stock + stock_lots
-- ============================================================
CREATE OR REPLACE FUNCTION void_shrinkage(p_shrinkage_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record      RECORD;
  v_cons        RECORD;
BEGIN
  IF (auth.jwt()->'app_metadata'->>'role') NOT IN ('admin', 'buyer') THEN
    RAISE EXCEPTION 'Solo administradores o compradores pueden anular mermas'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_record FROM shrinkage WHERE id = p_shrinkage_id;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'Merma no encontrada';
  END IF;

  IF v_record.voided THEN
    RAISE EXCEPTION 'La merma ya está anulada';
  END IF;

  -- Restaurar lotes FIFO
  FOR v_cons IN
    SELECT * FROM lot_consumptions
    WHERE consumed_type = 'shrinkage' AND consumed_id = p_shrinkage_id
  LOOP
    UPDATE stock_lots
    SET qty_remaining = qty_remaining + v_cons.qty
    WHERE id = v_cons.lot_id;
  END LOOP;

  DELETE FROM lot_consumptions
  WHERE consumed_type = 'shrinkage' AND consumed_id = p_shrinkage_id;

  -- Restaurar stock global
  UPDATE products SET stock = stock + v_record.qty WHERE id = v_record.product_id;

  -- Restaurar location_stock
  IF v_record.location_id IS NOT NULL THEN
    INSERT INTO location_stock (location_id, product_id, qty)
    VALUES (v_record.location_id, v_record.product_id, v_record.qty)
    ON CONFLICT (location_id, product_id)
    DO UPDATE SET qty = location_stock.qty + v_record.qty, updated_at = now();
  END IF;

  UPDATE shrinkage
  SET voided = true, voided_at = now()
  WHERE id = p_shrinkage_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION void_shrinkage(UUID) FROM public;
GRANT EXECUTE ON FUNCTION void_shrinkage(UUID) TO authenticated;

-- ============================================================
-- FUNCIÓN: adjust_stock
-- Ajusta el stock de un producto en una ubicación específica.
-- products.stock se recalcula como SUM(location_stock) — más robusto.
-- adjustment_data debe incluir location_id.
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_stock(adjustment_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id           UUID;
  v_product      RECORD;
  v_location_id  UUID;
  v_new_loc_qty  NUMERIC;
  v_old_loc_qty  NUMERIC;
  v_diff         NUMERIC;
  v_new_total    NUMERIC;
  v_lot          RECORD;
  v_to_consume   NUMERIC;
  v_from_lot     NUMERIC;
BEGIN
  v_location_id := NULLIF(adjustment_data->>'location_id', '')::UUID;

  SELECT id, name, stock, cost_price INTO v_product
  FROM products WHERE id = (adjustment_data->>'product_id')::UUID;

  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  v_new_loc_qty := (adjustment_data->>'new_stock')::NUMERIC;

  IF v_new_loc_qty < 0 THEN
    RAISE EXCEPTION 'El stock no puede ser negativo';
  END IF;

  -- Stock actual en la ubicación
  IF v_location_id IS NOT NULL THEN
    SELECT qty INTO v_old_loc_qty
    FROM location_stock
    WHERE location_id = v_location_id AND product_id = v_product.id;
    v_old_loc_qty := COALESCE(v_old_loc_qty, 0);
  ELSE
    v_old_loc_qty := v_product.stock;
  END IF;

  v_diff := v_new_loc_qty - v_old_loc_qty;

  INSERT INTO stock_adjustments (
    product_id, product_name, previous_stock, new_stock, difference, reason, adjusted_by, location_id
  ) VALUES (
    v_product.id, v_product.name, v_old_loc_qty, v_new_loc_qty,
    v_diff, adjustment_data->>'reason', adjustment_data->>'adjusted_by',
    v_location_id
  ) RETURNING id INTO v_id;

  -- Actualizar location_stock
  IF v_location_id IS NOT NULL THEN
    IF v_new_loc_qty > 0 THEN
      INSERT INTO location_stock (location_id, product_id, qty)
      VALUES (v_location_id, v_product.id, v_new_loc_qty)
      ON CONFLICT (location_id, product_id)
      DO UPDATE SET qty = v_new_loc_qty, updated_at = now();
    ELSE
      DELETE FROM location_stock
      WHERE location_id = v_location_id AND product_id = v_product.id;
    END IF;
  END IF;

  -- Actualizar lotes FIFO
  IF v_diff > 0 THEN
    INSERT INTO stock_lots (
      product_id, source_type, source_id,
      qty_initial, qty_remaining, cost_per_unit, lot_date, location_id
    ) VALUES (
      v_product.id, 'adjustment', v_id,
      v_diff, v_diff,
      COALESCE(v_product.cost_price, 0), CURRENT_DATE, v_location_id
    );
  ELSIF v_diff < 0 THEN
    v_to_consume := ABS(v_diff);
    FOR v_lot IN
      SELECT * FROM stock_lots
      WHERE product_id = v_product.id AND qty_remaining > 0
      ORDER BY lot_date ASC, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_to_consume <= 0;
      v_from_lot   := LEAST(v_lot.qty_remaining, v_to_consume);
      UPDATE stock_lots SET qty_remaining = qty_remaining - v_from_lot WHERE id = v_lot.id;
      v_to_consume := v_to_consume - v_from_lot;
    END LOOP;
  END IF;

  -- Recalcular products.stock como SUM(location_stock) — robusto e invariante
  SELECT COALESCE(SUM(qty), 0) INTO v_new_total
  FROM location_stock WHERE product_id = v_product.id;

  -- Si no hay location_stock y no se usó location_id, usar el ajuste directo
  IF v_location_id IS NULL THEN
    v_new_total := v_product.stock + v_diff;
  END IF;

  UPDATE products SET stock = v_new_total WHERE id = v_product.id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION adjust_stock(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION adjust_stock(JSONB) TO authenticated;
