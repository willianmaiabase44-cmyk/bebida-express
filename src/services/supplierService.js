// ============================================================
// supplierService.js — Fornecedores via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listSuppliers() {
  return apiJson('/suppliers');
}

export function getSupplier(id) {
  return apiJson(`/suppliers/${id}`);
}

export function createSupplier(data) {
  return apiJson('/suppliers', { method: 'POST', body: JSON.stringify(data) });
}

export function updateSupplier(id, data) {
  return apiJson(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteSupplier(id) {
  return apiJson(`/suppliers/${id}`, { method: 'DELETE' });
}