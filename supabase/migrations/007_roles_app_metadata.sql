-- Dos Huertos — Migración: Roles desde user_metadata → app_metadata
-- MOTIVO DE SEGURIDAD: user_metadata es editable por el propio usuario autenticado
-- via supabase.auth.updateUser(). app_metadata solo es editable con service_role key,
-- lo que garantiza que los roles solo pueden ser asignados por administradores.
--
-- PREREQUISITO DE DEPLOY: Antes de aplicar esta migración en producción, migrar los
-- roles de usuarios existentes via Admin API o con el bloque SQL al final de este archivo.
-- Ejecutar en Supabase SQL Editor DESPUÉS de 006_stock_adjustments.sql

-- ============================================================
-- MIGRAR DATOS: copiar role de user_metadata → app_metadata
-- en usuarios existentes (requiere acceso al schema auth)
-- ============================================================
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', raw_user_meta_data->>'role')
WHERE raw_user_meta_data->>'role' IN ('admin', 'buyer', 'cashier');

-- ============================================================
-- TABLA: products
-- ============================================================
DROP POLICY IF EXISTS "admin_write_products" ON products;
DROP POLICY IF EXISTS "admin_update_products" ON products;

CREATE POLICY "admin_write_products" ON products
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');

CREATE POLICY "admin_update_products" ON products
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'))
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

-- ============================================================
-- TABLA: suppliers
-- ============================================================
DROP POLICY IF EXISTS "admin_buyer_write_suppliers" ON suppliers;
DROP POLICY IF EXISTS "admin_buyer_update_suppliers" ON suppliers;

CREATE POLICY "admin_buyer_write_suppliers" ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

CREATE POLICY "admin_buyer_update_suppliers" ON suppliers
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

-- ============================================================
-- TABLA: purchase_orders
-- ============================================================
DROP POLICY IF EXISTS "admin_buyer_write_po" ON purchase_orders;
DROP POLICY IF EXISTS "admin_buyer_update_po" ON purchase_orders;

CREATE POLICY "admin_buyer_write_po" ON purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

CREATE POLICY "admin_buyer_update_po" ON purchase_orders
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

-- ============================================================
-- TABLA: purchase_items
-- ============================================================
DROP POLICY IF EXISTS "admin_buyer_write_pi" ON purchase_items;

CREATE POLICY "admin_buyer_write_pi" ON purchase_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

-- ============================================================
-- TABLA: sales
-- ============================================================
DROP POLICY IF EXISTS "admin_update_sales" ON sales;

CREATE POLICY "admin_update_sales" ON sales
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- ============================================================
-- TABLA: shrinkage
-- ============================================================
DROP POLICY IF EXISTS "admin_update_shrinkage" ON shrinkage;

CREATE POLICY "admin_update_shrinkage" ON shrinkage
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

-- ============================================================
-- TABLA: price_history
-- ============================================================
DROP POLICY IF EXISTS "admin_buyer_write_ph" ON price_history;

CREATE POLICY "admin_buyer_write_ph" ON price_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin','buyer'));

-- ============================================================
-- TABLA: units
-- ============================================================
DROP POLICY IF EXISTS "units_insert" ON units;
DROP POLICY IF EXISTS "units_update" ON units;
DROP POLICY IF EXISTS "units_delete" ON units;

CREATE POLICY "units_insert" ON units FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');

CREATE POLICY "units_update" ON units FOR UPDATE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

CREATE POLICY "units_delete" ON units FOR DELETE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- ============================================================
-- TABLA: unit_conversions
-- ============================================================
DROP POLICY IF EXISTS "uc_insert" ON unit_conversions;
DROP POLICY IF EXISTS "uc_update" ON unit_conversions;
DROP POLICY IF EXISTS "uc_delete" ON unit_conversions;

CREATE POLICY "uc_insert" ON unit_conversions FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin', 'buyer'));

CREATE POLICY "uc_update" ON unit_conversions FOR UPDATE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' IN ('admin', 'buyer'));

CREATE POLICY "uc_delete" ON unit_conversions FOR DELETE TO authenticated
  USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- ============================================================
-- TABLA: stock_adjustments
-- ============================================================
DROP POLICY IF EXISTS "sa_insert" ON stock_adjustments;

CREATE POLICY "sa_insert" ON stock_adjustments FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'app_metadata'->>'role' IN ('admin', 'buyer'));
