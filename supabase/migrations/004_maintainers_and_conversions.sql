-- Dos Huertos — Migración: Mantenedores (proveedores extendidos + unidades) y conversiones
-- Ejecutar en Supabase SQL Editor DESPUÉS de 003_per_product_margin.sql

-- ============================================================
-- EXTENDER PROVEEDORES
-- ============================================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- TABLA UNIDADES
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units_read" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units_insert" ON units FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' = 'admin');
CREATE POLICY "units_update" ON units FOR UPDATE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' = 'admin');

-- Seed unidades iniciales
INSERT INTO units (name, abbreviation, sort_order) VALUES
  ('kg', 'kg', 1),
  ('unidad', 'un', 2),
  ('atado', 'at', 3),
  ('bandeja', 'bdj', 4),
  ('frasco', 'fr', 5),
  ('rollo', 'rl', 6),
  ('ciento', 'cto', 7),
  ('caja', 'cj', 8),
  ('paquete', 'pq', 9)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLA CONVERSIONES DE UNIDAD
-- ============================================================
CREATE TABLE IF NOT EXISTS unit_conversions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id),
  from_unit   TEXT NOT NULL,
  to_unit     TEXT NOT NULL,
  factor      NUMERIC(10,4) NOT NULL CHECK (factor > 0),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, from_unit)
);

ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uc_read" ON unit_conversions FOR SELECT TO authenticated USING (true);
CREATE POLICY "uc_insert" ON unit_conversions FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' IN ('admin', 'buyer'));
CREATE POLICY "uc_update" ON unit_conversions FOR UPDATE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' IN ('admin', 'buyer'));
CREATE POLICY "uc_delete" ON unit_conversions FOR DELETE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' = 'admin');

CREATE INDEX IF NOT EXISTS idx_unit_conversions_product ON unit_conversions(product_id);

-- ============================================================
-- EXTENDER PURCHASE_ITEMS PARA CONVERSIONES
-- ============================================================
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS purchase_unit TEXT;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC(10,4) DEFAULT 1;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS base_qty NUMERIC(10,3);

-- ============================================================
-- CONVERSIONES ESTIMATIVAS PARA PRODUCTOS COMUNES
-- ============================================================
-- Se insertan solo si existen los productos (basado en seed.sql)
INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 18.0 FROM products WHERE name = 'Tomate' AND category = 'Verduras'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 5.0 FROM products WHERE name = 'Arandano' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 20.0 FROM products WHERE name = 'Manzana Royal' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 20.0 FROM products WHERE name = 'Manzana Verde' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 15.0 FROM products WHERE name = 'Naranja' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 13.0 FROM products WHERE name = 'Pera' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 10.0 FROM products WHERE name = 'Limon' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 8.0 FROM products WHERE name = 'Durazno' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 12.0 FROM products WHERE name = 'Kiwi' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 5.0 FROM products WHERE name = 'Frutilla' AND category = 'Frutas'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 20.0 FROM products WHERE name = 'Papa' AND category = 'Verduras'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 18.0 FROM products WHERE name = 'Cebolla' AND category = 'Verduras'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 20.0 FROM products WHERE name = 'Zanahoria' AND category = 'Verduras'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 10.0 FROM products WHERE name = 'Pimenton Rojo' AND category = 'Verduras'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 10.0 FROM products WHERE name = 'Pimenton Verde' AND category = 'Verduras'
ON CONFLICT (product_id, from_unit) DO NOTHING;

INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor)
SELECT id, 'caja', 'kg', 8.0 FROM products WHERE name = 'Lechuga' AND category = 'Verduras'
ON CONFLICT (product_id, from_unit) DO NOTHING;
