// ============================================================
// stockService.js — Movimentações de estoque via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listMovements(filters = {}) {
  const params = new URLSearchParams();
  if (filters.product_id) params.set('product_id', filters.product_id);
  if (filters.type) params.set('type', filters.type);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  const query = params.toString();
  return apiJson(`/stock-movements${query ? `?${query}` : ''}`);
}

export function getMovement(id) {
  return apiJson(`/stock-movements/${id}`);
}

export function createMovement(data) {
  return apiJson('/stock-movements', { method: 'POST', body: JSON.stringify(data) });
}