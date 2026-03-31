-- Dos Huertos — Funciones RPC para operaciones atómicas
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001_schema.sql

-- ============================================================
-- REGISTRAR ORDEN DE COMPRA
-- ============================================================
CREATE OR REPLACE FUNCTION register_purchase_order(order_data JSONB)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  item JSONB;
  v_item_total NUMERIC;
  v_old_cost NUMERIC;
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
    v_item_total := (item->>'qty')::NUMERIC * (item->>'cost_price')::NUMERIC;
    v_total := v_total + v_item_total;

    -- Insertar línea de compra
    INSERT INTO purchase_items (
      purchase_order_id, product_id, product_name, qty, unit, cost_price, total_cost
    ) VALUES (
      v_order_id,
      (item->>'product_id')::UUID,
      item->>'product_name',
      (item->>'qty')::NUMERIC,
      item->>'unit',
      (item->>'cost_price')::NUMERIC,
      v_item_total
    );

    -- Guardar costo anterior
    SELECT cost_price INTO v_old_cost
    FROM products WHERE id = (item->>'product_id')::UUID;

    -- Actualizar stock y precio de costo del producto
    UPDATE products
    SET stock = stock + (item->>'qty')::NUMERIC,
        cost_price = (item->>'cost_price')::NUMERIC,
        sale_price = CASE
          WHEN (item->>'cost_price')::NUMERIC > 0
            AND (item->>'cost_price')::NUMERIC != v_old_cost
          THEN CEIL((item->>'cost_price')::NUMERIC / 0.80)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ANULAR ORDEN DE COMPRA
-- ============================================================
CREATE OR REPLACE FUNCTION void_purchase_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
BEGIN
  -- Verificar que no esté ya anulada
  IF EXISTS (SELECT 1 FROM purchase_orders WHERE id = p_order_id AND voided = true) THEN
    RAISE EXCEPTION 'La orden ya está anulada';
  END IF;

  -- Revertir stock por cada línea
  FOR item IN SELECT * FROM purchase_items WHERE purchase_order_id = p_order_id
  LOOP
    UPDATE products
    SET stock = stock - item.qty
    WHERE id = item.product_id AND stock >= item.qty;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para revertir: %', item.product_name;
    END IF;
  END LOOP;

  -- Marcar como anulada
  UPDATE purchase_orders
  SET voided = true, voided_at = now()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- REGISTRAR VENTA
-- ============================================================
CREATE OR REPLACE FUNCTION register_sale(sale_data JSONB)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ANULAR VENTA
-- ============================================================
CREATE OR REPLACE FUNCTION void_sale(p_sale_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- REGISTRAR MERMA
-- ============================================================
CREATE OR REPLACE FUNCTION register_shrinkage(shrinkage_data JSONB)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ANULAR MERMA
-- ============================================================
CREATE OR REPLACE FUNCTION void_shrinkage(p_shrinkage_id UUID)
RETURNS VOID AS $$
DECLARE
  v_record RECORD;
BEGIN
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
  SET voided = true
  WHERE id = p_shrinkage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
