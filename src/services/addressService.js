// ============================================================
// addressService.js — Endereços com fallback Base44
// ============================================================

import { api } from '@/lib/apiClient';
import { isServerDown, tryServer, getCurrentCustomerId, invokeBase44 } from '@/lib/serverHealth';

export async function listAddresses(customerId) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.get(`/addresses/${customerId}`));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao carregar endereços');
    }
  }
  // Fallback: Base44 manageCustomerAddress function
  const data = await invokeBase44('manageCustomerAddress', { action: 'list', customer_id: customerId });
  return data.addresses || [];
}

export async function createAddress(customerId, address) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/addresses', { customer_id: customerId, ...address }));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao salvar endereço');
    }
  }
  // Fallback: Base44 manageCustomerAddress function
  const data = await invokeBase44('manageCustomerAddress', { action: 'create', customer_id: customerId, address });
  return data.address;
}

export async function deleteAddress(addressId) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.delete(`/addresses/${addressId}`));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao remover endereço');
    }
  }
  // Fallback: Base44 manageCustomerAddress function
  const customerId = getCurrentCustomerId();
  if (!customerId) throw new Error('Sessão expirada');
  return await invokeBase44('manageCustomerAddress', { action: 'delete', customer_id: customerId, address_id: addressId });
}