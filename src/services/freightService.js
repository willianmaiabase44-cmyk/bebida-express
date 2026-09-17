// ============================================================
// freightService.js — Frete com fallback Base44
// ============================================================

import { api } from '@/lib/apiClient';
import { isServerDown, tryServer, invokeBase44 } from '@/lib/serverHealth';

export async function calculateFreight(addressId) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/freight/calculate', { address_id: addressId }));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao calcular frete');
    }
  }
  // Fallback: Base44 calculateFreight function
  return await invokeBase44('calculateFreight', { address_id: addressId });
}