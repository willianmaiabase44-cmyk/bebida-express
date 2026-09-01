// ============================================================
// addressService.js — Endereços de cliente (frontend)
// ============================================================
// CRUD de endereços via backend /server. Nenhuma dependência do Base44.
// ============================================================

import { api } from '@/lib/apiClient';

export async function listAddresses(customerId) {
  const res = await api.get(`/addresses/${customerId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao carregar endereços');
  }
  return res.json();
}

export async function createAddress(customerId, address) {
  const res = await api.post('/addresses', { customer_id: customerId, ...address });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao salvar endereço');
  }
  return res.json();
}

export async function deleteAddress(addressId) {
  const res = await api.delete(`/addresses/${addressId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao remover endereço');
  }
  return res.json();
}