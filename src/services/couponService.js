// ============================================================
// couponService.js — Cupons com fallback Base44
// ============================================================

import { api } from '@/lib/apiClient';
import { isServerDown, tryServer, invokeBase44 } from '@/lib/serverHealth';

export async function validateCoupon(couponCode, customerId, subtotal) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/coupons/validate', { coupon_code: couponCode, customer_id: customerId, subtotal }));
    if (result.ok && result.res) {
      return await result.res.json().catch(() => ({}));
    }
    // Servidor respondeu com erro 4xx (cupom inválido/expirado) — repassa a mensagem
    if (result.res && !result.ok) {
      const errBody = await result.res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Cupom inválido');
    }
  }
  // Fallback: Base44 validateCoupon function
  return await invokeBase44('validateCoupon', { coupon_code: couponCode, customer_id: customerId, subtotal });
}