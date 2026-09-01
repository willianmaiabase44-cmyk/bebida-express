// ============================================================
// couponService.js — Validação de cupom (frontend)
// ============================================================
// Chama POST /api/coupons/validate no /server. Nenhuma dependência do Base44.
// Apenas valida (preview) — não consome o cupom. O consumo acontece
// na transação do placeOrder no backend.
// ============================================================

import { api } from '@/lib/apiClient';

export async function validateCoupon(couponCode, customerId, subtotal) {
  const res = await api.post('/coupons/validate', {
    coupon_code: couponCode,
    customer_id: customerId,
    subtotal,
  });
  const data = await res.json().catch(() => ({}));
  // /validate sempre retorna 200 com { valid: true/false }
  return data;
}