-- ============================================================
-- 001_init.sql — Schema inicial do Smoke Bebidas
-- Migração das 14 entities do Base44 para PostgreSQL
-- Preserva TODOS os campos, enums, relacionamentos e regras
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS (admins da plataforma)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  password_hash VARCHAR(255),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- 2. CUSTOMERS (clientes do delivery)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ============================================================
-- 3. CUSTOMER_ADDRESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Casa',
  cep VARCHAR(10),
  street VARCHAR(255) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(255),
  district VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  reference TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses(customer_id);

-- ============================================================
-- 4. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('cervejas','refrigerantes','energeticos','aguas','destilados','vinhos','sucos','gelo')),
  price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2),
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  total_sold INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- ============================================================
-- 5. DELIVERY_DRIVERS (motoboys)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  login VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(255),
  vehicle_type VARCHAR(20) NOT NULL DEFAULT 'moto' CHECK (vehicle_type IN ('moto','carro','bicicleta')),
  plate VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel','ocupado','offline')),
  rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drivers_login ON delivery_drivers(login);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON delivery_drivers(status);

-- ============================================================
-- SEQUENCE para order_number
-- Evita duplicação em pedidos simultâneos (não usar "último + 1")
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

-- ============================================================
-- 6. ORDERS (entidade central)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_number INTEGER NOT NULL DEFAULT nextval('order_number_seq'),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255),
  address_cep VARCHAR(10),
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(255),
  address_district VARCHAR(255),
  address_city VARCHAR(255),
  address_state VARCHAR(2),
  address_reference TEXT,
  address_full TEXT,
  address_lat DOUBLE PRECISION,
  address_lng DOUBLE PRECISION,
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  distance_km NUMERIC(10,1),
  freight_per_km NUMERIC(10,2),
  freight NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code VARCHAR(50),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('dinheiro','pix','cartao_entrega')),
  change_for NUMERIC(10,2),
  status VARCHAR(30) NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','confirmado','em_preparacao','pronto','saiu_para_entrega','entregue','cancelado')),
  motoboy_id UUID REFERENCES delivery_drivers(id) ON DELETE SET NULL,
  motoboy_name VARCHAR(255),
  motoboy_assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  channel VARCHAR(10) NOT NULL DEFAULT 'online' CHECK (channel IN ('online','pdv')),
  notes TEXT,
  status_history JSONB,
  date DATE NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_motoboy ON orders(motoboy_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);

-- ============================================================
-- 7. SALES (PDV)
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  items JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('dinheiro','pix','cartao_credito','cartao_debito')),
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  change NUMERIC(10,2) NOT NULL DEFAULT 0,
  channel VARCHAR(10) NOT NULL DEFAULT 'pdv' CHECK (channel IN ('pdv','online')),
  status VARCHAR(20) NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida','cancelada')),
  date DATE NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);

-- ============================================================
-- 8. DELIVERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20),
  address TEXT NOT NULL,
  reference TEXT,
  items_description TEXT,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  motoboy_id UUID REFERENCES delivery_drivers(id) ON DELETE SET NULL,
  motoboy_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_rota','entregue','cancelada')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance INTEGER,
  duration INTEGER,
  date DATE NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_motoboy ON deliveries(motoboy_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- ============================================================
-- 9. DELIVERY_REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number INTEGER,
  customer_id UUID NOT NULL,
  customer_name VARCHAR(255),
  motoboy_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  motoboy_name VARCHAR(255),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  date DATE NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON delivery_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_motoboy ON delivery_reviews(motoboy_id);

-- ============================================================
-- 10. STOCK_MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  type VARCHAR(10) NOT NULL CHECK (type IN ('entrada','saida')),
  quantity INTEGER NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  stock_after INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_date ON stock_movements(date);

-- ============================================================
-- 11. PROMOTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  original_price NUMERIC(10,2),
  promo_price NUMERIC(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  banner_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promo_product ON promotions(product_id);
CREATE INDEX IF NOT EXISTS idx_promo_active ON promotions(active);

-- ============================================================
-- 12. STORE_SETTINGS (singleton — 1 registro)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(255) NOT NULL DEFAULT 'Smoke Bebidas',
  cep VARCHAR(10),
  street VARCHAR(255),
  number VARCHAR(20),
  complement VARCHAR(255),
  district VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(2),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  freight_table JSONB NOT NULL DEFAULT '[]',
  freight_per_km NUMERIC(10,2) NOT NULL DEFAULT 2.5,
  min_freight NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_freight_threshold NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_delivery_radius_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_delivery_minutes INTEGER NOT NULL DEFAULT 30,
  delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_city VARCHAR(255) NOT NULL DEFAULT 'Gravataí',
  delivery_state VARCHAR(2) NOT NULL DEFAULT 'RS',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 13. SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  cnpj VARCHAR(20),
  category VARCHAR(100),
  address TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. COUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER NOT NULL DEFAULT 1,
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  used_count INTEGER NOT NULL DEFAULT 0,
  used_by JSONB NOT NULL DEFAULT '[]',
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);

-- ============================================================
-- Trigger para updated_date automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica trigger em todas as tabelas que têm updated_date
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'users','customers','customer_addresses','products','delivery_drivers',
      'orders','sales','deliveries','delivery_reviews','promotions',
      'store_settings','suppliers','coupons'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_date ON %I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_updated_date BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_date();', t);
  END LOOP;
END $$;