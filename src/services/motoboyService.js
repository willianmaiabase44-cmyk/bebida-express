// ============================================================
// motoboyService.js — Motoboys via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listMotoboys() {
  return apiJson('/motoboys');
}

export function getMotoboy(id) {
  return apiJson(`/motoboys/${id}`);
}

export function createMotoboy(data) {
  return apiJson('/motoboys', { method: 'POST', body: JSON.stringify(data) });
}

export function updateMotoboy(id, data) {
  return apiJson(`/motoboys/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteMotoboy(id) {
  return apiJson(`/motoboys/${id}`, { method: 'DELETE' });
}

export function getAllReviews() {
  return apiJson('/motoboys/reviews');
}

export function getMotoboyOrders(id, type) {
  const query = type ? `?type=${type}` : '';
  return apiJson(`/motoboys/${id}/orders${query}`);
}

export function getMotoboyReviews(id) {
  return apiJson(`/motoboys/${id}/reviews`);
}