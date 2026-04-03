-- Dos Huertos — Migración: Sistema FIFO de Lotes de Stock
-- Ejecutar en Supabase SQL Editor DESPUÉS de 008_fix_security_definer.sql
--
-- CAMBIOS:
-- 1. Tabla stock_lots — cada compra/ajuste crea un lote con qty_remaining
-- 2. Tabla lot_consumptions — registra qué lotes consume cada venta/merma
-- 3. sale_items.cost_total, shrinkage.cost_total — costo real FIFO
-- 4. consume_lots_fifo() — helper que consume lotes FIFO y retorna costo total
-- 5. Reescritura de todos los RPCs con lógica FIFO
-- 6. Migración de datos: lotes desde 7 órdenes de compra existentes,
--    consumptions retroactivos para ventas/mermas existentes, reconciliación

-- ============================================================
-- NUEVAS TABLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_lots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id),
  source_type      TEXT NOT NULL CHECK (source_type IN ('purchase', 'adjustment')),
  source_id        UUID NOT NULL,
  purchase_item_id UUID REFERENCES purchase_items(id),
  qty_initial      NUMERIC(10,3) NOT NULL CHECK (qty_initial > 0),
  qty_remaining    NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (qty_remaining >= 0),
  cost_per_unit    NUMERIC(12,4) NOT NULL DEFAULT 0,
  lot_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lot_consumptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id           UUID NOT NULL REFERENCES stock_lots(id),
  consumed_type    TEXT NOT NULL CHECK (consumed_type IN ('sale', 'shrinkage')),
  consumed_id      UUID NOT NULL,
  consumed_item_id UUID,
  qty              NUMERIC(10,3) NOT NULL CHECK (qty > 0),
  cost_per_unit    NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_lots_product_date
  ON stock_lots(product_id, lot_date, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_lots_source
  ON stock_lots(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_lot_consumptions_lot
  ON lot_consumptions(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_consumptions_consumed
  ON lot_consumptions(consumed_type, consumed_id);

-- ============================================================
-- NUEVAS COLUMNAS
-- ============================================================

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_total NUMERIC(10,2);
ALTER TABLE shrinkage  ADD COLUMN IF NOT EXISTS cost_total NUMERIC(10,2);

-- ============================================================
-- RLS PARA NUEVAS TABLAS
-- ============================================================

ALTER TABLE stock_lots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_consumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read" ON stock_lots;
DROP POLICY IF EXISTS "auth_read" ON lot_consumptions;

CREATE POLICY "auth_read" ON stock_lots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read" ON lot_consumptions
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- FUNCIÓN HELPER: consume_lots_fifo
-- Consume unidades de los lotes más antiguos (FIFO).
-- Retorna costo total consumido.
-- Solo llamable desde otras funciones SECURITY DEFINER.
-- ============================================================

CREATE OR REPLACE FUNCTION consume_lots_fifo(
  p_product_id   UUID,
  p_qty          NUMERIC,
  p_type         TEXT,
  p_consumed_id  UUID,
  p_item_id      UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lot        RECORD;
  v_remaining  NUMERIC := p_qty;
  v_from_lot   NUMERIC;
  v_cost_total NUMERIC := 0;
BEGIN
  FOR v_lot IN
    SELECT * FROM stock_lots
    WHERE product_id = p_product_id
      AND qty_remaining > 0
    ORDER BY lot_date ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_from_lot := LEAST(v_lot.qty_remaining, v_remaining);

    UPDATE stock_lots
    SET qty_remaining = qty_remaining - v_from_lot
    WHERE id = v_lot.id;

    INSERT INTO lot_consumptions (
      lot_id, consumed_type, consumed_id, consumed_item_id, qty, cost_per_unit
    ) VALUES (
      v_lot.id, p_type, p_consumed_id, p_item_id, v_from_lot, v_lot.cost_per_unit
    );

    v_cost_total := v_cost_total + (v_from_lot * v_lot.cost_per_unit);
    v_remaining  := v_remaining - v_from_lot;
  END LOOP;

  RETURN v_cost_total;
END;
$$;

-- Solo ejecutable por funciones SECURITY DEFINER (postgres owner), no por authenticated
REVOKE EXECUTE ON FUNCTION consume_lots_fifo(UUID, NUMERIC, TEXT, UUID, UUID) FROM public;

-- ============================================================
-- FUNCTION: register_purchase_order (crea lote FIFO por ítem)
-- ============================================================

CREATE OR REPLACE FUNCTION register_purchase_order(order_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id    UUID;
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
  v_order_date := COALESCE((order_data->>'date')::DATE, CURRENT_DATE);

  INSERT INTO purchase_orders (
    date, supplier_id, buyer_name, has_invoice, invoice_number, comments, total_cost
  ) VALUES (
    v_order_date,
    NULLIF(order_data->>'supplier_id', '')::UUID,
    order_data->>'buyer_name',
    COALESCE((order_data->>'has_invoice')::BOOLEAN, false),
    NULLIF(order_data->>'invoice_number', ''),
    NULLIF(order_data->>'comments', ''),
    0
  ) RETURNING id INTO v_order_id;

  FOR item IN SELECT * FROM jsonb_array_elements(order_data->'items')
  LOOP
    v_conv_factor := COALESCE((item->>'conversion_factor')::NUMERIC, 1);
    v_base_qty    := (item->>'qty')::NUMERIC * v_conv_factor;
    v_item_total  := (item->>'qty')::NUMERIC * (item->>'cost_price')::NUMERIC;
    v_total       := v_total + v_item_total;
    -- Costo por unidad base (ej: $/kg cuando se compra por caja)
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

    -- Crear lote FIFO
    INSERT INTO stock_lots (
      product_id, source_type, source_id, purchase_item_id,
      qty_initial, qty_remaining, cost_per_unit, lot_date
    ) VALUES (
      (item->>'product_id')::UUID,
      'purchase',
      v_order_id,
      v_item_id,
      v_base_qty,
      v_base_qty,
      v_cost_per_u,
      v_order_date
    );

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
-- FUNCTION: void_purchase_order (revierte solo qty_remaining del lote)
-- ============================================================

CREATE OR REPLACE FUNCTION void_purchase_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lot RECORD;
BEGIN
  IF (auth.jwt()->'app_metadata'->>'role') != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden anular órdenes de compra'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (SELECT 1 FROM purchase_orders WHERE id = p_order_id AND voided = true) THEN
    RAISE EXCEPTION 'La orden ya está anulada';
  END IF;

  -- Revertir solo el stock restante (qty ya consumida en ventas/mermas no se toca)
  FOR v_lot IN
    SELECT * FROM stock_lots
    WHERE source_type = 'purchase' AND source_id = p_order_id
      AND qty_remaining > 0
    FOR UPDATE
  LOOP
    UPDATE products
    SET stock = stock - v_lot.qty_remaining
    WHERE id = v_lot.product_id;

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
-- FUNCTION: register_sale (consume FIFO + guarda cost_total)
-- ============================================================

CREATE OR REPLACE FUNCTION register_sale(sale_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id    UUID;
  item         JSONB;
  v_stock      NUMERIC;
  v_subtotal   NUMERIC := 0;
  v_discount   NUMERIC;
  v_total      NUMERIC;
  v_item_id    UUID;
  v_cost_total NUMERIC;
BEGIN
  -- Verificar stock de todos los ítems primero
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

  -- Calcular descuento y total
  v_discount := COALESCE((sale_data->>'discount')::NUMERIC, 0);
  IF sale_data->>'discount_type' = 'percent' THEN
    v_discount := ROUND(v_subtotal * v_discount / 100);
  END IF;
  v_total := v_subtotal - v_discount;

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

    -- Consumir lotes FIFO y guardar costo real
    v_cost_total := consume_lots_fifo(
      (item->>'product_id')::UUID,
      (item->>'qty')::NUMERIC,
      'sale',
      v_sale_id,
      v_item_id
    );

    UPDATE sale_items SET cost_total = v_cost_total WHERE id = v_item_id;

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
-- FUNCTION: void_sale (restaura exactamente los lotes consumidos)
-- ============================================================

CREATE OR REPLACE FUNCTION void_sale(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item RECORD;
  v_cons RECORD;
BEGIN
  IF (auth.jwt()->'app_metadata'->>'role') != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden anular ventas'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id AND voided = true) THEN
    RAISE EXCEPTION 'La venta ya está anulada';
  END IF;

  -- Restaurar los lotes consumidos exactamente
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

  -- Restaurar stock en productos
  FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE products SET stock = stock + v_item.qty WHERE id = v_item.product_id;
  END LOOP;

  UPDATE sales SET voided = true, voided_at = now() WHERE id = p_sale_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION void_sale(UUID) FROM public;
GRANT EXECUTE ON FUNCTION void_sale(UUID) TO authenticated;

-- ============================================================
-- FUNCTION: register_shrinkage (consume FIFO + guarda cost_total)
-- ============================================================

CREATE OR REPLACE FUNCTION register_shrinkage(shrinkage_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id    UUID;
  v_stock NUMERIC;
  v_qty   NUMERIC;
  v_cost  NUMERIC;
BEGIN
  v_qty := (shrinkage_data->>'qty')::NUMERIC;

  SELECT stock INTO v_stock
  FROM products WHERE id = (shrinkage_data->>'product_id')::UUID;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  IF v_stock < v_qty THEN
    RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', v_stock, v_qty;
  END IF;

  INSERT INTO shrinkage (
    product_id, product_name, qty, unit, reason, notes, date
  ) VALUES (
    (shrinkage_data->>'product_id')::UUID,
    shrinkage_data->>'product_name',
    v_qty,
    shrinkage_data->>'unit',
    shrinkage_data->>'reason',
    NULLIF(shrinkage_data->>'notes', ''),
    COALESCE(NULLIF(shrinkage_data->>'date', '')::DATE, CURRENT_DATE)
  ) RETURNING id INTO v_id;

  -- Consumir lotes FIFO y obtener costo real
  v_cost := consume_lots_fifo(
    (shrinkage_data->>'product_id')::UUID,
    v_qty,
    'shrinkage',
    v_id,
    v_id
  );

  UPDATE shrinkage
  SET estimated_value = v_cost,
      cost_total      = v_cost
  WHERE id = v_id;

  UPDATE products
  SET stock = stock - v_qty
  WHERE id = (shrinkage_data->>'product_id')::UUID;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_shrinkage(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION register_shrinkage(JSONB) TO authenticated;

-- ============================================================
-- FUNCTION: void_shrinkage (restaura exactamente los lotes consumidos)
-- ============================================================

CREATE OR REPLACE FUNCTION void_shrinkage(p_shrinkage_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record RECORD;
  v_cons   RECORD;
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

  -- Restaurar los lotes consumidos exactamente
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

  UPDATE products SET stock = stock + v_record.qty WHERE id = v_record.product_id;

  UPDATE shrinkage
  SET voided = true, voided_at = now()
  WHERE id = p_shrinkage_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION void_shrinkage(UUID) FROM public;
GRANT EXECUTE ON FUNCTION void_shrinkage(UUID) TO authenticated;

-- ============================================================
-- FUNCTION: adjust_stock (crea lote si sube, consume FIFO si baja)
-- ============================================================

CREATE OR REPLACE FUNCTION adjust_stock(adjustment_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id        UUID;
  v_product   RECORD;
  v_new_stock NUMERIC;
  v_diff      NUMERIC;
  v_to_consume NUMERIC;
  v_lot       RECORD;
  v_from_lot  NUMERIC;
BEGIN
  SELECT id, name, stock, cost_price INTO v_product
  FROM products WHERE id = (adjustment_data->>'product_id')::UUID;

  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  v_new_stock := (adjustment_data->>'new_stock')::NUMERIC;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'El stock no puede ser negativo';
  END IF;

  v_diff := v_new_stock - v_product.stock;

  INSERT INTO stock_adjustments (
    product_id, product_name, previous_stock, new_stock, difference, reason, adjusted_by
  ) VALUES (
    v_product.id, v_product.name, v_product.stock, v_new_stock,
    v_diff, adjustment_data->>'reason', adjustment_data->>'adjusted_by'
  ) RETURNING id INTO v_id;

  IF v_diff > 0 THEN
    -- Aumento: crear lote con costo actual del producto
    INSERT INTO stock_lots (
      product_id, source_type, source_id,
      qty_initial, qty_remaining, cost_per_unit, lot_date
    ) VALUES (
      v_product.id, 'adjustment', v_id,
      v_diff, v_diff,
      COALESCE(v_product.cost_price, 0), CURRENT_DATE
    );

  ELSIF v_diff < 0 THEN
    -- Reducción: consumir lotes FIFO (sin crear lot_consumptions para evitar
    -- referencias huérfanas — los ajustes manuales no son anulables vía void_shrinkage)
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

  UPDATE products SET stock = v_new_stock WHERE id = v_product.id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION adjust_stock(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION adjust_stock(JSONB) TO authenticated;

-- ============================================================
-- MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================

-- Paso 1: Crear lotes desde las órdenes de compra no anuladas
-- El costo por unidad base = cost_price / conversion_factor
INSERT INTO stock_lots (
  product_id, source_type, source_id, purchase_item_id,
  qty_initial, qty_remaining, cost_per_unit, lot_date
)
SELECT
  pi.product_id,
  'purchase',
  po.id,
  pi.id,
  COALESCE(pi.base_qty, pi.qty),
  COALESCE(pi.base_qty, pi.qty),
  ROUND(pi.cost_price / COALESCE(NULLIF(pi.conversion_factor, 0), 1), 4),
  po.date
FROM purchase_items pi
JOIN purchase_orders po ON po.id = pi.purchase_order_id
WHERE NOT po.voided
ORDER BY po.date ASC, po.created_at ASC, pi.id ASC;

-- Paso 2: Consumir retroactivamente para ventas existentes no anuladas (FIFO)
DO $$
DECLARE
  v_item       RECORD;
  v_lot        RECORD;
  v_remaining  NUMERIC;
  v_cost_total NUMERIC;
  v_from_lot   NUMERIC;
BEGIN
  FOR v_item IN
    SELECT si.id, si.sale_id, si.product_id, si.qty
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE NOT s.voided
    ORDER BY s.created_at ASC, si.id ASC
  LOOP
    v_remaining  := v_item.qty;
    v_cost_total := 0;

    FOR v_lot IN
      SELECT * FROM stock_lots
      WHERE product_id = v_item.product_id
        AND qty_remaining > 0
      ORDER BY lot_date ASC, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_from_lot   := LEAST(v_lot.qty_remaining, v_remaining);
      v_cost_total := v_cost_total + v_from_lot * v_lot.cost_per_unit;

      UPDATE stock_lots
      SET qty_remaining = qty_remaining - v_from_lot
      WHERE id = v_lot.id;

      INSERT INTO lot_consumptions (
        lot_id, consumed_type, consumed_id, consumed_item_id, qty, cost_per_unit
      ) VALUES (
        v_lot.id, 'sale', v_item.sale_id, v_item.id, v_from_lot, v_lot.cost_per_unit
      );

      v_remaining := v_remaining - v_from_lot;
    END LOOP;

    UPDATE sale_items SET cost_total = v_cost_total WHERE id = v_item.id;
  END LOOP;
END;
$$;

-- Paso 3: Consumir retroactivamente para mermas existentes no anuladas (FIFO)
DO $$
DECLARE
  v_rec        RECORD;
  v_lot        RECORD;
  v_remaining  NUMERIC;
  v_cost_total NUMERIC;
  v_from_lot   NUMERIC;
BEGIN
  FOR v_rec IN
    SELECT id, product_id, qty
    FROM shrinkage
    WHERE NOT voided
    ORDER BY created_at ASC
  LOOP
    v_remaining  := v_rec.qty;
    v_cost_total := 0;

    FOR v_lot IN
      SELECT * FROM stock_lots
      WHERE product_id = v_rec.product_id
        AND qty_remaining > 0
      ORDER BY lot_date ASC, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_from_lot   := LEAST(v_lot.qty_remaining, v_remaining);
      v_cost_total := v_cost_total + v_from_lot * v_lot.cost_per_unit;

      UPDATE stock_lots
      SET qty_remaining = qty_remaining - v_from_lot
      WHERE id = v_lot.id;

      INSERT INTO lot_consumptions (
        lot_id, consumed_type, consumed_id, consumed_item_id, qty, cost_per_unit
      ) VALUES (
        v_lot.id, 'shrinkage', v_rec.id, v_rec.id, v_from_lot, v_lot.cost_per_unit
      );

      v_remaining := v_remaining - v_from_lot;
    END LOOP;

    UPDATE shrinkage SET cost_total = v_cost_total WHERE id = v_rec.id;
  END LOOP;
END;
$$;

-- Paso 4: Reconciliar diferencias (por ajustes manuales previos o inconsistencias)
DO $$
DECLARE
  v_prod    RECORD;
  v_lot_sum NUMERIC;
  v_diff    NUMERIC;
  v_adj_id  UUID;
  v_lot_r   RECORD;
  v_to_reduce NUMERIC;
  v_reduce    NUMERIC;
BEGIN
  FOR v_prod IN
    SELECT id, name, stock, cost_price
    FROM products
    WHERE stock > 0 OR EXISTS (SELECT 1 FROM stock_lots WHERE product_id = products.id)
  LOOP
    SELECT COALESCE(SUM(qty_remaining), 0) INTO v_lot_sum
    FROM stock_lots WHERE product_id = v_prod.id;

    v_diff := v_prod.stock - v_lot_sum;

    IF ABS(v_diff) > 0.001 THEN
      IF v_diff > 0 THEN
        -- Hay más stock registrado que lotes: crear lote de reconciliación
        INSERT INTO stock_adjustments (
          product_id, product_name, previous_stock, new_stock, difference, reason, adjusted_by
        ) VALUES (
          v_prod.id, v_prod.name, v_lot_sum, v_prod.stock, v_diff,
          'Reconciliación migración FIFO', 'sistema'
        ) RETURNING id INTO v_adj_id;

        INSERT INTO stock_lots (
          product_id, source_type, source_id,
          qty_initial, qty_remaining, cost_per_unit, lot_date
        ) VALUES (
          v_prod.id, 'adjustment', v_adj_id,
          v_diff, v_diff,
          COALESCE(v_prod.cost_price, 0), CURRENT_DATE
        );

        RAISE NOTICE 'Reconciliación: % — agregados % unidades en lote de ajuste',
          v_prod.name, v_diff;

      ELSE
        -- Hay más lotes que stock: reducir lotes más recientes (edge case)
        v_to_reduce := ABS(v_diff);

        FOR v_lot_r IN
          SELECT * FROM stock_lots
          WHERE product_id = v_prod.id AND qty_remaining > 0
          ORDER BY lot_date DESC, created_at DESC
          FOR UPDATE
        LOOP
          EXIT WHEN v_to_reduce <= 0;
          v_reduce := LEAST(v_lot_r.qty_remaining, v_to_reduce);
          UPDATE stock_lots SET qty_remaining = qty_remaining - v_reduce WHERE id = v_lot_r.id;
          v_to_reduce := v_to_reduce - v_reduce;
        END LOOP;

        RAISE NOTICE 'Reconciliación inversa: % — reducidos % unidades de lotes',
          v_prod.name, ABS(v_diff);
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Paso 5: Validación final — asegura que sum(qty_remaining) = products.stock
DO $$
DECLARE
  v_prod    RECORD;
  v_lot_sum NUMERIC;
  v_errors  INTEGER := 0;
BEGIN
  FOR v_prod IN SELECT id, name, stock FROM products
  LOOP
    SELECT COALESCE(SUM(qty_remaining), 0) INTO v_lot_sum
    FROM stock_lots WHERE product_id = v_prod.id;

    IF ABS(v_prod.stock - v_lot_sum) > 0.001 THEN
      RAISE WARNING 'VALIDACIÓN FALLIDA: % — stock=%, lotes_remaining=%',
        v_prod.name, v_prod.stock, v_lot_sum;
      v_errors := v_errors + 1;
    END IF;
  END LOOP;

  IF v_errors > 0 THEN
    RAISE EXCEPTION 'Migración FIFO completada con % error(es) de validación. Revisar WARNINGS.', v_errors;
  END IF;

  RAISE NOTICE 'Migración FIFO completada exitosamente. Todos los stocks validados.';
END;
$$;
