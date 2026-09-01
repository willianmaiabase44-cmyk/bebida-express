-- ============================================================
-- 006_idempotency_key.sql — Idempotência na criação de pedidos
-- ============================================================
-- Adiciona coluna idempotency_key à tabela orders.
-- Quando o frontend envia um Idempotency-Key (header), o backend
-- verifica se já existe um pedido com aquela chave. Se sim,
-- retorna o pedido existente em vez de criar um duplicado.
-- Protege contra duplo-clique e retry de rede.
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;