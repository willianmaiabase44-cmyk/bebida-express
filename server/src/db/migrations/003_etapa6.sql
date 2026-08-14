-- ============================================================
-- 003_etapa6.sql — Índices para relatórios e PDV
-- ============================================================
-- Otimiza consultas agregadas por data, canal, método de pagamento.
-- ============================================================

-- Índices compostos para filtros de relatório em sales
CREATE INDEX IF NOT EXISTS idx_sales_channel ON sales(channel);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_date_channel ON sales(date, channel);

-- Índices compostos para filtros de relatório em orders
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_date_channel ON orders(date, channel);

-- Índice para stock_movements por tipo + data
CREATE INDEX IF NOT EXISTS idx_stock_type_date ON stock_movements(type, date);

-- Índice para promotions por data (promoções vigentes)
CREATE INDEX IF NOT EXISTS idx_promo_dates ON promotions(start_date, end_date);