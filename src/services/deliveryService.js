// ============================================================
// deliveryService.js — Entregas via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listDeliveries() {
  return apiJson('/deliveries');
}

export function getDelivery(id) {
  return apiJson(`/deliveries/${id}`);
}

export function createDelivery(data) {
  return apiJson('/deliveries', { method: 'POST', body: JSON.stringify(data) });
}

export function updateDelivery(id, data) {
  return apiJson(`/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function updateDeliveryStatus(id, status) {
  return apiJson(`/deliveries/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function deleteDelivery(id) {
  return apiJson(`/deliveries/${id}`, { method: 'DELETE' });
}