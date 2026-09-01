// ============================================================
// freightService.js — Cálculo de frete (frontend)
// ============================================================
// Chama POST /api/freight/calculate no /server. Nenhuma dependência do Base44.
// ============================================================

import { api } from '@/lib/apiClient';

export async function calculateFreight(addressId) {
  const res = await api.post('/freight/calculate', { address_id: addressId });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao calcular frete');
  }
  return res.json();
}