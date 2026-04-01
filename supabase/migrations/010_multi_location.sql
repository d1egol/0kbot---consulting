-- Dos Huertos — Migración: Multi-Local
-- Ejecutar en Supabase SQL Editor DESPUÉS de 009_stock_lots.sql
--
-- Permite que Basti y Feña diferencien el stock por ubicación física
-- (local, bodega, pedidos online) con visibilidad compartida.
--
-- MODELO:
--   products.stock     = total global (suma de location_stock)
--   location_stock     = qty por (ubicación, producto) ← fuente de verdad por lugar
--   stock_lots         = lotes FIFO globales (no dependen de ubicación)
--   stock_transfers    = movimientos entre ubicaciones

-- ============================================================
-- TABLA: locations
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  type       TEXT NOT NULL DEFAULT 'store'
             CHECK (type IN ('store', 'warehouse', 'online')),
  address    TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loc_read" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "loc_insert" ON locations FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY "loc_update" ON locations FOR UPDATE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY "loc_delete" ON locations FOR DELETE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- Ubicación por defecto: todo el stock histórico va aquí
INSERT INTO locations (name, type, sort_order) VALUES ('Principal', 'store', 0);

-- ============================================================
-- TABLA: location_stock
-- Fuente de verdad de cuánto hay en cada lugar.
-- products.stock = SUM(qty) por producto en esta tabla.
-- ============================================================
CREATE TABLE IF NOT EXISTS location_stock (
  location_id UUID NOT NULL REFERENCES locations(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  qty         NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (qty >= 0),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (location_id, product_id)
);

ALTER TABLE location_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ls_read" ON location_stock FOR SELECT TO authenticated USING (true);
-- Las mutaciones ocurren solo desde funciones SECURITY DEFINER (RPCs)
CREATE POLICY "ls_rpc_write" ON location_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_location_stock_product ON location_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_location_stock_location ON location_stock(location_id);

-- ============================================================
-- TABLA: stock_transfers
-- Registro de movimientos entre ubicaciones.
-- No toca products.stock (el total global no cambia).
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location_id UUID REFERENCES locations(id),
  to_location_id   UUID REFERENCES locations(id),
  product_id       UUID NOT NULL REFERENCES products(id),
  product_name     TEXT NOT NULL,
  qty              NUMERIC(10,3) NOT NULL CHECK (qty > 0),
  transferred_by   TEXT NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "st_read" ON stock_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "st_insert" ON stock_transfers FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin', 'buyer'));

CREATE INDEX IF NOT EXISTS idx_stock_transfers_product ON stock_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from ON stock_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to ON stock_transfers(to_location_id);

-- ============================================================
-- AGREGAR location_id A TABLAS DE OPERACIONES
-- NULL en registros históricos (pre-migración) → se backfillean a 'Principal'
-- ============================================================
ALTER TABLE purchase_orders    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE sales              ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE shrinkage          ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE stock_adjustments  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE stock_lots         ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- ============================================================
-- BACKFILL: asignar todos los registros existentes a 'Principal'
-- ============================================================
DO $$
DECLARE
  v_principal_id UUID;
BEGIN
  SELECT id INTO v_principal_id FROM locations WHERE name = 'Principal';

  UPDATE purchase_orders   SET location_id = v_principal_id WHERE location_id IS NULL;
  UPDATE sales             SET location_id = v_principal_id WHERE location_id IS NULL;
  UPDATE shrinkage         SET location_id = v_principal_id WHERE location_id IS NULL;
  UPDATE stock_adjustments SET location_id = v_principal_id WHERE location_id IS NULL;
  UPDATE stock_lots        SET location_id = v_principal_id WHERE location_id IS NULL;
END;
$$;

-- ============================================================
-- SEED: location_stock desde products.stock para 'Principal'
-- Todo el stock actual vive en 'Principal' hasta que se transfiera
-- ============================================================
INSERT INTO location_stock (location_id, product_id, qty)
SELECT
  (SELECT id FROM locations WHERE name = 'Principal'),
  id,
  stock
FROM products
WHERE stock > 0
ON CONFLICT (location_id, product_id) DO UPDATE SET qty = EXCLUDED.qty;

-- ============================================================
-- ÍNDICES ADICIONALES EN TABLAS CON location_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_purchase_orders_location ON purchase_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_location ON sales(location_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_location ON shrinkage(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_lots_location ON stock_lots(location_id);

-- ============================================================
-- FUNCIÓN: transfer_stock — mover stock entre ubicaciones (atómica)
-- ============================================================
CREATE OR REPLACE FUNCTION transfer_stock(transfer_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id             UUID;
  v_from_id        UUID;
  v_to_id          UUID;
  v_product_id     UUID;
  v_qty            NUMERIC;
  v_available      NUMERIC;
  v_product_name   TEXT;
BEGIN
  v_from_id    := (transfer_data->>'from_location_id')::UUID;
  v_to_id      := (transfer_data->>'to_location_id')::UUID;
  v_product_id := (transfer_data->>'product_id')::UUID;
  v_qty        := (transfer_data->>'qty')::NUMERIC;

  IF v_qty <= 0 THEN
    RAISE EXCEPTION 'La cantidad a transferir debe ser mayor a 0';
  END IF;

  IF v_from_id = v_to_id THEN
    RAISE EXCEPTION 'El origen y destino deben ser distintos';
  END IF;

  -- Verificar stock disponible en origen
  SELECT qty INTO v_available
  FROM location_stock
  WHERE location_id = v_from_id AND product_id = v_product_id;

  IF v_available IS NULL OR v_available < v_qty THEN
    RAISE EXCEPTION 'Stock insuficiente en ubicación origen: disponible %, solicitado %',
      COALESCE(v_available, 0), v_qty;
  END IF;

  SELECT name INTO v_product_name FROM products WHERE id = v_product_id;

  -- Descontar del origen
  UPDATE location_stock
  SET qty = qty - v_qty, updated_at = now()
  WHERE location_id = v_from_id AND product_id = v_product_id;

  -- Limpiar filas con qty = 0
  DELETE FROM location_stock
  WHERE location_id = v_from_id AND product_id = v_product_id AND qty = 0;

  -- Agregar al destino (insert o update)
  INSERT INTO location_stock (location_id, product_id, qty)
  VALUES (v_to_id, v_product_id, v_qty)
  ON CONFLICT (location_id, product_id)
  DO UPDATE SET qty = location_stock.qty + v_qty, updated_at = now();

  -- Registrar transferencia
  INSERT INTO stock_transfers (
    from_location_id, to_location_id, product_id, product_name, qty, transferred_by, notes
  ) VALUES (
    v_from_id,
    v_to_id,
    v_product_id,
    v_product_name,
    v_qty,
    transfer_data->>'transferred_by',
    NULLIF(transfer_data->>'notes', '')
  ) RETURNING id INTO v_id;

  -- products.stock NO cambia: la transferencia no altera el total global

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION transfer_stock(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION transfer_stock(JSONB) TO authenticated;
