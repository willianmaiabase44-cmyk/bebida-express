// ============================================================
// saleService.js — Vendas PDV via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listSales(filters = {}) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  const query = params.toString();
  return apiJson(`/sales${query ? `?${query}` : ''}`);
}

export function getSale(id) {
  return apiJson(`/sales/${id}`);
}

export function createSale(data) {
  return apiJson('/sales', { method: 'POST', body: JSON.stringify(data) });
}

export function cancelSale(id) {
  return apiJson(`/sales/${id}/cancel`, { method: 'PATCH' });
}