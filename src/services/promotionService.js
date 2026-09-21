// ============================================================
// promotionService.js — Promoções via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listPromotions(all = false) {
  const query = all ? '?all=true' : '';
  return apiJson(`/promotions${query}`);
}

export function getPromotion(id) {
  return apiJson(`/promotions/${id}`);
}

export function createPromotion(data) {
  return apiJson('/promotions', { method: 'POST', body: JSON.stringify(data) });
}

export function updatePromotion(id, data) {
  return apiJson(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deletePromotion(id) {
  return apiJson(`/promotions/${id}`, { method: 'DELETE' });
}