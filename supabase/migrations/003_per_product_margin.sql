-- Dos Huertos — Migración: Margen por producto
-- Ejecutar en Supabase SQL Editor DESPUÉS de 002_rpc_functions.sql

-- Agregar columna margin_percent a productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00;

-- Backfill: calcular margen real para productos con precios existentes
UPDATE products
SET margin_percent = ROUND(((sale_price - cost_price) / NULLIF(sale_price, 0)) * 100, 2)
WHERE cost_price > 0 AND sale_price > 0;

-- Actualizar register_purchase_order para usar margen por producto
CREATE OR REPLACE FUNCTION register_purchase_order(order_data JSONB)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar void_purchase_order para usar base_qty
CREATE OR REPLACE FUNCTION void_purchase_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
  v_revert_qty NUMERIC;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
