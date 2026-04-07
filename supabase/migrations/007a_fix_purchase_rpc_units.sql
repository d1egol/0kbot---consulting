-- Dos Huertos — Fix register_purchase_order y void_purchase_order
-- Problema: purchase_unit, conversion_factor y base_qty se perdían al guardar
--           El stock se incrementaba por qty (ej: 2 cajas) en vez de base_qty (ej: 36 kg)
--           void_purchase_order revertía por qty en vez de base_qty

-- ============================================================
-- REGISTRAR ORDEN DE COMPRA (versión corregida)
-- ============================================================
CREATE OR REPLACE FUNCTION register_purchase_order(order_data JSONB)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  item JSONB;
  v_item_total NUMERIC;
  v_old_cost NUMERIC;
  v_qty NUMERIC;
  v_cost NUMERIC;
  v_base_qty NUMERIC;
  v_conversion_factor NUMERIC;
  v_margin NUMERIC;
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
    v_qty  := (item->>'qty')::NUMERIC;
    v_cost := (item->>'cost_price')::NUMERIC;
    v_item_total := v_qty * v_cost;
    v_total := v_total + v_item_total;

    -- Calcular conversion_factor y base_qty
    -- base_qty es la cantidad en unidad base que entra al stock
    IF (item->>'conversion_factor') IS NOT NULL
       AND (item->>'conversion_factor') != ''
       AND (item->>'conversion_factor')::NUMERIC > 0
       AND NULLIF(item->>'purchase_unit', '') IS NOT NULL
       AND item->>'purchase_unit' IS DISTINCT FROM item->>'unit'
    THEN
      v_conversion_factor := (item->>'conversion_factor')::NUMERIC;
      v_base_qty          := v_qty * v_conversion_factor;
    ELSE
      v_conversion_factor := NULL;
      v_base_qty          := v_qty;
    END IF;

    -- Insertar línea de compra con datos de conversión
    INSERT INTO purchase_items (
      purchase_order_id, product_id, product_name,
      qty, unit, cost_price, total_cost,
      purchase_unit, conversion_factor, base_qty
    ) VALUES (
      v_order_id,
      (item->>'product_id')::UUID,
      item->>'product_name',
      v_qty,
      item->>'unit',
      v_cost,
      v_item_total,
      NULLIF(item->>'purchase_unit', ''),
      v_conversion_factor,
      v_base_qty
    );

    -- Guardar costo anterior y margen del producto
    SELECT cost_price, COALESCE(margin_percent, 20)
    INTO v_old_cost, v_margin
    FROM products WHERE id = (item->>'product_id')::UUID;

    -- Actualizar stock usando base_qty (unidad base real) y recalcular precio venta
    UPDATE products
    SET stock      = stock + v_base_qty,
        cost_price = v_cost,
        sale_price = CASE
          WHEN v_cost > 0 AND v_cost IS DISTINCT FROM v_old_cost
          THEN CEIL(v_cost / (1.0 - v_margin / 100.0))
          ELSE sale_price
        END
    WHERE id = (item->>'product_id')::UUID;

    -- Registrar historial de precios si cambió el costo
    IF v_old_cost IS DISTINCT FROM v_cost AND v_cost > 0 THEN
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
-- ANULAR ORDEN DE COMPRA (versión corregida)
-- Usa base_qty para revertir el stock correcto
-- ============================================================
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
    -- Revertir usando base_qty si existe (cantidad real ingresada al stock)
    -- Para registros sin conversión, base_qty = qty
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
