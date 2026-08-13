// ============================================================
// couponService.js — SERVIÇO DE CUPONS
// ============================================================
// Validação e aplicação de cupons (a implementar na Etapa 2)
//
// Regras a preservar (da auditoria do Base44):
//   - code único, maiúsculo
//   - active === true
//   - dentro de start_date / end_date
//   - used_count < max_uses (se max_uses > 0)
//   - subtotal >= min_order_value (se > 0)
//   - per_customer_limit (conta ocorrências de customer_id em used_by)
//   - desconto = subtotal * discount_percent / 100
//
// Na criação do pedido, o cupom deve ser validado E incrementado
// dentro da mesma transação (SELECT ... FOR UPDATE no cupom).
// ============================================================

// STATUS: PENDENTE — Etapa 2
export async function validateCoupon(code, customerId, subtotal) {
  throw new Error('validateCoupon ainda não implementado — Etapa 2');
}