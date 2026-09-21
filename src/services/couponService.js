// ============================================================
// couponService.js — Cupons via API /server (sem fallback)
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function validateCoupon(couponCode, customerId, subtotal) {
  return apiJson('/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ coupon_code: couponCode, customer_id: customerId, subtotal }),
  });
}

export function listCoupons() {
  return apiJson('/coupons');
}

export function createCoupon(data) {
  return apiJson('/coupons', { method: 'POST', body: JSON.stringify(data) });
}

export function updateCoupon(id, data) {
  return apiJson(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteCoupon(id) {
  return apiJson(`/coupons/${id}`, { method: 'DELETE' });
}