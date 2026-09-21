// ============================================================
// orderService.js — Pedidos via API /server (sem fallback)
// ============================================================

import { apiJson } from '@/lib/apiClient';

export async function createOrder(payload, idempotencyKey) {
  const headers = {};
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return apiJson('/orders', { method: 'POST', body: JSON.stringify(payload), headers });
}

export function getOrderById(orderId) {
  return apiJson(`/orders/${orderId}`);
}

export function getMyOrders(customerId) {
  return apiJson(`/orders/customer/${customerId}`);
}

export function listOrders() {
  return apiJson('/orders');
}

export function updateOrderStatus(orderId, status) {
  return apiJson(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function assignDriver(orderId, motoboyId) {
  return apiJson(`/orders/${orderId}/assign-driver`, { method: 'PATCH', body: JSON.stringify({ motoboy_id: motoboyId }) });
}

export function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
}