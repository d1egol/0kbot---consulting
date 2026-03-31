-- Dos Huertos — Schema principal
-- Ejecutar en Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PRODUCTOS
CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  category     TEXT NOT NULL
               CHECK (category IN ('Frutas','Verduras','Otros','Insumos')),
  unit         TEXT NOT NULL DEFAULT 'kg',
  cost_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock        NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock    NUMERIC(10,3) NOT NULL DEFAULT 3,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, category)
);

-- HISTORIAL DE PRECIOS
CREATE TABLE price_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES products(id),
  cost_price        NUMERIC(10,2) NOT NULL,
  sale_price        NUMERIC(10,2) NOT NULL,
  purchase_order_id UUID,
  recorded_at       TIMESTAMPTZ DEFAULT now()
);

-- PROVEEDORES
CREATE TABLE suppliers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÓRDENES DE COMPRA
CREATE TABLE purchase_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id    UUID REFERENCES suppliers(id),
  buyer_name     TEXT NOT NULL,
  has_invoice    BOOLEAN NOT NULL DEFAULT false,
  invoice_number TEXT,
  comments       TEXT,
  total_cost     NUMERIC(10,2) NOT NULL DEFAULT 0,
  voided         BOOLEAN NOT NULL DEFAULT false,
  voided_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- LÍNEAS DE COMPRA
CREATE TABLE purchase_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id),
  product_name      TEXT NOT NULL,
  qty               NUMERIC(10,3) NOT NULL,
  unit              TEXT NOT NULL,
  cost_price        NUMERIC(10,2) NOT NULL,
  total_cost        NUMERIC(10,2) NOT NULL
);

-- VENTAS
CREATE TABLE sales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date           TIMESTAMPTZ DEFAULT now(),
  cashier_name   TEXT NOT NULL,
  subtotal       NUMERIC(10,2) NOT NULL,
  discount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_type  TEXT CHECK (discount_type IN ('percent','fixed')),
  total          NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL
               CHECK (payment_method IN ('cash','card','transfer')),
  cash_received  NUMERIC(10,2),
  cash_change    NUMERIC(10,2),
  voided         BOOLEAN NOT NULL DEFAULT false,
  voided_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- LÍNEAS DE VENTA
CREATE TABLE sale_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  qty          NUMERIC(10,3) NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL,
  subtotal     NUMERIC(10,2) NOT NULL
);

-- MERMAS
CREATE TABLE shrinkage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  product_id      UUID REFERENCES products(id),
  product_name    TEXT NOT NULL,
  qty             NUMERIC(10,3) NOT NULL,
  unit            TEXT NOT NULL,
  reason          TEXT NOT NULL
                  CHECK (reason IN ('vencimiento','daño','error','robo','otro')),
  estimated_value NUMERIC(10,2),
  notes           TEXT,
  voided          BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- TRIGGER: updated_at automático en productos
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrinkage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history   ENABLE ROW LEVEL SECURITY;

-- Lectura: todos los autenticados leen todo
CREATE POLICY "auth_read" ON products        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON suppliers       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON purchase_items  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON sales           FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON sale_items      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON shrinkage       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON price_history   FOR SELECT TO authenticated USING (true);

-- Escritura products: solo admin
CREATE POLICY "admin_write_products" ON products
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' = 'admin');

CREATE POLICY "admin_update_products" ON products
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'))
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'));

-- Escritura suppliers: admin y buyer
CREATE POLICY "admin_buyer_write_suppliers" ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'));

CREATE POLICY "admin_buyer_update_suppliers" ON suppliers
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'));

-- Escritura purchase_orders: admin y buyer
CREATE POLICY "admin_buyer_write_po" ON purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'));

CREATE POLICY "admin_buyer_update_po" ON purchase_orders
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'));

-- Escritura purchase_items: admin y buyer
CREATE POLICY "admin_buyer_write_pi" ON purchase_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'));

-- Escritura sales: todos los autenticados
CREATE POLICY "auth_write_sales" ON sales
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_update_sales" ON sales
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' = 'admin');

-- Escritura sale_items: todos los autenticados
CREATE POLICY "auth_write_sale_items" ON sale_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- Escritura shrinkage: todos los autenticados
CREATE POLICY "auth_write_shrinkage" ON shrinkage
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_update_shrinkage" ON shrinkage
  FOR UPDATE TO authenticated
  USING (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'));

-- Escritura price_history: admin y buyer
CREATE POLICY "admin_buyer_write_ph" ON price_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->'user_metadata'->>'role' IN ('admin','buyer'));

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_purchase_items_order ON purchase_items(purchase_order_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_shrinkage_product ON shrinkage(product_id);
