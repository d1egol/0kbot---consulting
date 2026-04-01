-- Dos Huertos — Migración: voided_at en shrinkage + DELETE policy en units
-- Ejecutar en Supabase SQL Editor DESPUÉS de 004

-- Agregar voided_at a shrinkage (consistencia con sales y purchase_orders)
ALTER TABLE shrinkage ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- Actualizar void_shrinkage para registrar timestamp
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
  SET voided = true, voided_at = now()
  WHERE id = p_shrinkage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar DELETE policy a tabla units (faltaba)
CREATE POLICY "units_delete" ON units FOR DELETE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' = 'admin');
