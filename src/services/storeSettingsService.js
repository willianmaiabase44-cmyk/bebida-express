// ============================================================
// storeSettingsService.js — Configurações da loja via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function getSettings() {
  return apiJson('/store-settings');
}

export function updateSettings(data) {
  return apiJson('/store-settings', { method: 'PUT', body: JSON.stringify(data) });
}