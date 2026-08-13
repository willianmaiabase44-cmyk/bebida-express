// ============================================================
// storeSettingsService.js — SERVIÇO DE CONFIGURAÇÕES DA LOJA
// ============================================================
// SINGLETON: garante que exista sempre um único registro.
// GET é público. PUT é admin.
// ============================================================

import { storeSettingsRepository } from '../repositories/storeSettingsRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Garante que o singleton existe — cria com defaults se necessário.
async function ensureSingleton() {
  let settings = await storeSettingsRepository.getSingleton();
  if (!settings) {
    settings = await storeSettingsRepository.create({});
  }
  return settings;
}

export const storeSettingsService = {
  // GET /api/store-settings — público
  async getSettings() {
    return ensureSingleton();
  },

  // PUT /api/store-settings — admin
  async updateSettings(data) {
    const settings = await ensureSingleton();

    const updateData = {};
    const allowedFields = [
      'store_name', 'cep', 'street', 'number', 'complement', 'district',
      'city', 'state', 'lat', 'lng',
      'freight_table', 'freight_per_km', 'min_freight', 'free_freight_threshold',
      'max_delivery_radius_km', 'estimated_delivery_minutes',
      'delivery_enabled', 'delivery_city', 'delivery_state',
    ];

    for (const f of allowedFields) {
      if (data[f] !== undefined) {
        updateData[f] = data[f];
      }
    }

    // Validações básicas
    if (updateData.freight_table !== undefined) {
      if (!Array.isArray(updateData.freight_table)) {
        throw httpError('freight_table deve ser uma lista', 400);
      }
      // Valida cada faixa
      for (const range of updateData.freight_table) {
        if (range.distance_km == null || range.price == null) {
          throw httpError('Cada faixa de frete precisa de distance_km e price', 400);
        }
      }
    }
    if (updateData.freight_per_km !== undefined) {
      updateData.freight_per_km = Number(updateData.freight_per_km);
      if (isNaN(updateData.freight_per_km)) throw httpError('freight_per_km inválido', 400);
    }
    if (updateData.min_freight !== undefined) {
      updateData.min_freight = Number(updateData.min_freight);
    }
    if (updateData.free_freight_threshold !== undefined) {
      updateData.free_freight_threshold = Number(updateData.free_freight_threshold);
    }
    if (updateData.max_delivery_radius_km !== undefined) {
      updateData.max_delivery_radius_km = Number(updateData.max_delivery_radius_km);
    }
    if (updateData.estimated_delivery_minutes !== undefined) {
      updateData.estimated_delivery_minutes = Number(updateData.estimated_delivery_minutes);
    }
    if (updateData.lat !== undefined) {
      updateData.lat = updateData.lat !== null ? Number(updateData.lat) : null;
    }
    if (updateData.lng !== undefined) {
      updateData.lng = updateData.lng !== null ? Number(updateData.lng) : null;
    }
    if (updateData.delivery_enabled !== undefined) {
      updateData.delivery_enabled = Boolean(updateData.delivery_enabled);
    }

    return storeSettingsRepository.update(settings.id, updateData);
  },
};