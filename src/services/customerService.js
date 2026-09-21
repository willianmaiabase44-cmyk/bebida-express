// ============================================================
// customerService.js — Clientes via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listCustomers() {
  return apiJson('/customers');
}

export function getCustomer(id) {
  return apiJson(`/customers/${id}`);
}

export function createCustomer(data) {
  return apiJson('/customers', { method: 'POST', body: JSON.stringify(data) });
}

export function updateCustomer(id, data) {
  return apiJson(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteCustomer(id) {
  return apiJson(`/customers/${id}`, { method: 'DELETE' });
}