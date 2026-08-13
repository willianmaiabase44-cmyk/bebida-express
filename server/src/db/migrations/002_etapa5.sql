-- ============================================================
-- 002_etapa5.sql — Constraints da Etapa 5
-- ============================================================
-- Unique constraint em delivery_reviews.order_id garante que
-- duas avaliações simultâneas para o mesmo pedido nunca passem
-- (última falha com erro de constraint — anti-race no DB).
-- ============================================================

-- Uma avaliação por pedido (anti-race em concorrência)
ALTER TABLE delivery_reviews
  ADD CONSTRAINT uq_delivery_reviews_order_id UNIQUE (order_id);