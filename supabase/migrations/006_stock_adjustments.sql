-- Dos Huertos — Migración: Ajustes manuales de stock
-- Ejecutar en Supabase SQL Editor DESPUÉS de 005

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  previous_stock NUMERIC(10,3) NOT NULL,
  new_stock   NUMERIC(10,3) NOT NULL,
  difference  NUMERIC(10,3) NOT NULL,
  reason      TEXT NOT NULL,
  adjusted_by TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_read" ON stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "sa_insert" ON stock_adjustments FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' IN ('admin', 'buyer'));

CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id);

CREATE OR REPLACE FUNCTION adjust_stock(adjustment_data JSONB)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
