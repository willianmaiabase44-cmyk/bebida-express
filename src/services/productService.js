// ============================================================
// productService.js — Produtos via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listProducts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.includeInactive) params.set('include_inactive', 'true');
  if (filters.category) params.set('category', filters.category);
  if (filters.featured) params.set('featured', 'true');
  if (filters.isNew) params.set('new', 'true');
  const query = params.toString();
  return apiJson(`/products${query ? `?${query}` : ''}`);
}

export function getProduct(id) {
  return apiJson(`/products/${id}`);
}

export function createProduct(data) {
  return apiJson('/products', { method: 'POST', body: JSON.stringify(data) });
}

export function updateProduct(id, data) {
  return apiJson(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteProduct(id) {
  return apiJson(`/products/${id}`, { method: 'DELETE' });
}