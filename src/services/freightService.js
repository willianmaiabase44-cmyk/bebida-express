// ============================================================
// freightService.js — Frete e rota via API /server (sem fallback)
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function calculateFreight(addressId) {
  return apiJson('/freight/calculate', {
    method: 'POST',
    body: JSON.stringify({ address_id: addressId }),
  });
}

export function getDeliveryRoute(address) {
  return apiJson('/freight/route', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
}