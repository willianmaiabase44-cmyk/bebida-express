// ============================================================
// couponService.js — Cupons com fallback Base44
// ============================================================

import { api } from '@/lib/apiClient';
import { isServerDown, tryServer, invokeBase44 } from '@/lib/serverHealth';

export async function validateCoupon(couponCode, customerId, subtotal) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/coupons/validate', { coupon_code: couponCode, customer_id: customerId, subtotal }));
    if (result.ok || result.res) {
      return await result.res.json().catch(() => ({}));
    }
  }
  // Fallback: Base44 validateCoupon function
  return await invokeBase44('validateCoupon', { coupon_code: couponCode, customer_id: customerId, subtotal });
}