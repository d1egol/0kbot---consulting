-- Dos Huertos — Migración: Hardening de funciones SECURITY DEFINER
-- Ejecutar en Supabase SQL Editor DESPUÉS de 007_roles_app_metadata.sql
--
-- CAMBIOS:
-- 1. SET search_path = public, pg_temp en todas las funciones — previene object shadowing attacks
-- 2. REVOKE EXECUTE ON FUNCTION ... FROM public — limita ejecución solo a authenticated
-- 3. GRANT EXECUTE ON FUNCTION ... TO authenticated — explícito y documentado
-- 4. Checks explícitos de rol en funciones de anulación (void_*) — defensa en profundidad
--    independiente de RLS, por si se bypasea en el futuro vía service_role o migración

-- ============================================================
-- REGISTRAR ORDEN DE COMPRA
-- (versión vigente de 003_per_product_margin.sql + search_path)
-- ============================================================
CREATE OR REPLACE FUNCTION register_purchase_order(order_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  item JSONB;
  v_item_total NUMERIC;
  v_old_cost NUMERIC;
  v_margin NUMERIC;
  v_base_qty NUMERIC;
  v_conv_factor NUMERIC;
BEGIN
  -- Insertar la orden
  INSERT INTO purchase_orders (
    date, supplier_id, buyer_name, has_invoice, invoice_number, comments, total_cost
  ) VALUES (
    COALESCE((order_data->>'date')::DATE, CURRENT_DATE),
    NULLIF(order_data->>'supplier_id', '')::UUID,
    order_data->>'buyer_name',
    COALESCE((order_data->>'has_invoice')::BOOLEAN, false),
    NULLIF(order_data->>'invoice_number', ''),
    NULLIF(order_data->>'comments', ''),
    0
  ) RETURNING id INTO v_order_id;

  -- Procesar cada línea
  FOR item IN SELECT * FROM jsonb_array_elements(order_data->'items')
  LOOP
    -- Factor de conversión (default 1 si no viene)
    v_conv_factor := COALESCE((item->>'conversion_factor')::NUMERIC, 1);
    v_base_qty := (item->>'qty')::NUMERIC * v_conv_factor;
    v_item_total := (item->>'qty')::NUMERIC * (item->>'cost_price')::NUMERIC;
    v_total := v_total + v_item_total;

    -- Insertar línea de compra
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
    );

    -- Guardar costo y margen anterior
    SELECT cost_price, margin_percent INTO v_old_cost, v_margin
    FROM products WHERE id = (item->>'product_id')::UUID;

    -- Actualizar stock (usar base_qty) y precio de costo del producto
    UPDATE products
    SET stock = stock + v_base_qty,
        cost_price = CASE
          WHEN v_conv_factor > 1 THEN ROUND((item->>'cost_price')::NUMERIC / v_conv_factor, 2)
          ELSE (item->>'cost_price')::NUMERIC
        END,
        sale_price = CASE
          WHEN (item->>'cost_price')::NUMERIC > 0
            AND (item->>'cost_price')::NUMERIC != v_old_cost
          THEN CEIL(
            CASE
              WHEN v_conv_factor > 1 THEN ROUND((item->>'cost_price')::NUMERIC / v_conv_factor, 2)
              ELSE (item->>'cost_price')::NUMERIC
            END
            / (1.0 - COALESCE(v_margin, 20) / 100.0)
          )
          ELSE sale_price
        END
    WHERE id = (item->>'product_id')::UUID;

    -- Registrar historial de precios si cambió el costo
    IF v_old_cost IS DISTINCT FROM (item->>'cost_price')::NUMERIC
       AND (item->>'cost_price')::NUMERIC > 0 THEN
      INSERT INTO price_history (product_id, cost_price, sale_price, purchase_order_id)
      SELECT id, cost_price, sale_price, v_order_id
      FROM products WHERE id = (item->>'product_id')::UUID;
    END IF;
  END LOOP;

  -- Actualizar total de la orden
  UPDATE purchase_orders SET total_cost = v_total WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_purchase_order(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION register_purchase_order(JSONB) TO authenticated;

-- ============================================================
-- ANULAR ORDEN DE COMPRA
-- (versión vigente de 003_per_product_margin.sql + search_path + rol check)
-- Solo admin puede anular órdenes de compra.
-- ============================================================
CREATE OR REPLACE FUNCTION void_purchase_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item RECORD;
  v_revert_qty NUMERIC;
BEGIN
  -- Defensa en profundidad: verificar rol explícitamente, independiente de RLS
  IF (auth.jwt()->'app_metadata'->>'role') != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden anular órdenes de compra'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (SELECT 1 FROM purchase_orders WHERE id = p_order_id AND voided = true) THEN
    RAISE EXCEPTION 'La orden ya está anulada';
  END IF;

  FOR item IN SELECT * FROM purchase_items WHERE purchase_order_id = p_order_id
  LOOP
    v_revert_qty := COALESCE(item.base_qty, item.qty);
    UPDATE products
    SET stock = stock - v_revert_qty
    WHERE id = item.product_id AND stock >= v_revert_qty;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para revertir: %', item.product_name;
    END IF;
  END LOOP;

  UPDATE purchase_orders
  SET voided = true, voided_at = now()
  WHERE id = p_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION void_purchase_order(UUID) FROM public;
GRANT EXECUTE ON FUNCTION void_purchase_order(UUID) TO authenticated;

-- ============================================================
-- REGISTRAR VENTA
-- (versión vigente de 002_rpc_functions.sql + search_path)
-- ============================================================
CREATE OR REPLACE FUNCTION register_sale(sale_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id UUID;
  item JSONB;
  v_stock NUMERIC;
  v_subtotal NUMERIC := 0;
  v_discount NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Verificar stock de todos los items primero
  FOR item IN SELECT * FROM jsonb_array_elements(sale_data->'items')
  LOOP
    SELECT stock INTO v_stock
    FROM products
    WHERE id = (item->>'product_id')::UUID AND active = true;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Producto no encontrado o inactivo: %', item->>'product_name';
    END IF;

    IF v_stock < (item->>'qty')::NUMERIC THEN
      RAISE EXCEPTION 'Stock insuficiente para %: disponible %, solicitado %',
        item->>'product_name', v_stock, (item->>'qty')::NUMERIC;
    END IF;

    v_subtotal := v_subtotal + ((item->>'qty')::NUMERIC * (item->>'unit_price')::NUMERIC);
  END LOOP;

  -- Calcular descuento
  v_discount := COALESCE((sale_data->>'discount')::NUMERIC, 0);
  IF sale_data->>'discount_type' = 'percent' THEN
    v_discount := ROUND(v_subtotal * v_discount / 100);
  END IF;
  v_total := v_subtotal - v_discount;

  -- Insertar venta
  INSERT INTO sales (
    cashier_name, subtotal, discount, discount_type, total,
    payment_method, cash_received, cash_change
  ) VALUES (
    sale_data->>'cashier_name',
    v_subtotal,
    v_discount,
    NULLIF(sale_data->>'discount_type', ''),
    v_total,
    sale_data->>'payment_method',
    NULLIF(sale_data->>'cash_received', '')::NUMERIC,
    NULLIF(sale_data->>'cash_change', '')::NUMERIC
  ) RETURNING id INTO v_sale_id;

  -- Insertar líneas y descontar stock
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
    );

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
-- ANULAR VENTA
-- (versión vigente de 002_rpc_functions.sql + search_path + rol check)
-- Solo admin puede anular ventas.
-- ============================================================
CREATE OR REPLACE FUNCTION void_sale(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item RECORD;
BEGIN
  -- Defensa en profundidad: verificar rol explícitamente, independiente de RLS
  IF (auth.jwt()->'app_metadata'->>'role') != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden anular ventas'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND voided = true) THEN
    RAISE EXCEPTION 'La venta ya está anulada';
  END IF;

  -- Restaurar stock
  FOR item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE products
    SET stock = stock + item.qty
    WHERE id = item.product_id;
  END LOOP;

  UPDATE sales
  SET voided = true, voided_at = now()
  WHERE id = p_sale_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION void_sale(UUID) FROM public;
GRANT EXECUTE ON FUNCTION void_sale(UUID) TO authenticated;

-- ============================================================
-- REGISTRAR MERMA
-- (versión vigente de 002_rpc_functions.sql + search_path)
-- ============================================================
CREATE OR REPLACE FUNCTION register_shrinkage(shrinkage_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_stock NUMERIC;
  v_cost NUMERIC;
  v_qty NUMERIC;
BEGIN
  v_qty := (shrinkage_data->>'qty')::NUMERIC;

  SELECT stock, cost_price INTO v_stock, v_cost
  FROM products
  WHERE id = (shrinkage_data->>'product_id')::UUID;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  IF v_stock < v_qty THEN
    RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', v_stock, v_qty;
  END IF;

  INSERT INTO shrinkage (
    product_id, product_name, qty, unit, reason, estimated_value, notes, date
  ) VALUES (
    (shrinkage_data->>'product_id')::UUID,
    shrinkage_data->>'product_name',
    v_qty,
    shrinkage_data->>'unit',
    shrinkage_data->>'reason',
    v_qty * v_cost,
    NULLIF(shrinkage_data->>'notes', ''),
    COALESCE(NULLIF(shrinkage_data->>'date', '')::DATE, CURRENT_DATE)
  ) RETURNING id INTO v_id;

  UPDATE products
  SET stock = stock - v_qty
  WHERE id = (shrinkage_data->>'product_id')::UUID;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_shrinkage(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION register_shrinkage(JSONB) TO authenticated;

-- ============================================================
-- ANULAR MERMA
-- (versión vigente de 005_shrinkage_voided_at_and_units_delete.sql + search_path + rol check)
-- Solo admin o buyer pueden anular mermas.
-- ============================================================
CREATE OR REPLACE FUNCTION void_shrinkage(p_shrinkage_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Defensa en profundidad: verificar rol explícitamente, independiente de RLS
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

  UPDATE products
  SET stock = stock + v_record.qty
  WHERE id = v_record.product_id;

  UPDATE shrinkage
  SET voided = true, voided_at = now()
  WHERE id = p_shrinkage_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION void_shrinkage(UUID) FROM public;
GRANT EXECUTE ON FUNCTION void_shrinkage(UUID) TO authenticated;

-- ============================================================
-- AJUSTAR STOCK MANUAL
-- (versión vigente de 006_stock_adjustments.sql + search_path)
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_stock(adjustment_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_product RECORD;
  v_new_stock NUMERIC;
BEGIN
  SELECT id, name, stock INTO v_product
  FROM products WHERE id = (adjustment_data->>'product_id')::UUID;

  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  v_new_stock := (adjustment_data->>'new_stock')::NUMERIC;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'El stock no puede ser negativo';
  END IF;

  INSERT INTO stock_adjustments (
    product_id, product_name, previous_stock, new_stock, difference, reason, adjusted_by
  ) VALUES (
    v_product.id, v_product.name, v_product.stock, v_new_stock,
    v_new_stock - v_product.stock, adjustment_data->>'reason', adjustment_data->>'adjusted_by'
  ) RETURNING id INTO v_id;

  UPDATE products SET stock = v_new_stock WHERE id = v_product.id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION adjust_stock(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION adjust_stock(JSONB) TO authenticated;
