// ============================================================
// orderService.js — Pedidos com fallback Base44
// ============================================================

import { api } from '@/lib/apiClient';
import { isServerDown, tryServer, getCurrentCustomerId, invokeBase44 } from '@/lib/serverHealth';

export async function createOrder(payload, idempotencyKey) {
  if (!isServerDown()) {
    const headers = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const result = await tryServer(() => api.post('/orders', payload, { headers }));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao finalizar pedido');
    }
  }
  // Fallback: Base44 placeOrder function
  return await invokeBase44('placeOrder', payload);
}

export async function getOrderById(orderId) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.get(`/orders/${orderId}`));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Pedido não encontrado');
    }
  }
  // Fallback: Base44 getCustomerOrders function
  const customerId = getCurrentCustomerId();
  if (!customerId) throw new Error('Sessão expirada');
  const data = await invokeBase44('getCustomerOrders', { customer_id: customerId, order_id: orderId });
  return data.order;
}

export async function getMyOrders(customerId) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.get(`/orders/customer/${customerId}`));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao carregar pedidos');
    }
  }
  // Fallback: Base44 getCustomerOrders function
  const data = await invokeBase44('getCustomerOrders', { customer_id: customerId });
  return data.orders || [];
}

export function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
}