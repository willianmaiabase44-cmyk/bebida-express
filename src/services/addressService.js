// ============================================================
// addressService.js — Endereços via API /server (sem fallback)
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listAddresses(customerId) {
  return apiJson(`/addresses/${customerId}`);
}

export function createAddress(customerId, address) {
  return apiJson('/addresses', {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId, ...address }),
  });
}

export function updateAddress(addressId, address) {
  return apiJson(`/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(address),
  });
}

export function deleteAddress(addressId) {
  return apiJson(`/addresses/${addressId}`, { method: 'DELETE' });
}