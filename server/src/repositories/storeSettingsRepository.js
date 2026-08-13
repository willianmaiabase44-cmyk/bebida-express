// ============================================================
// storeSettingsRepository.js — Acesso a dados da tabela store_settings
// ============================================================
// SINGLETON: deve existir somente um registro ativo.
// ============================================================

import { pool } from '../db/index.js';

const ALLOWED_FIELDS = [
  'store_name', 'cep', 'street', 'number', 'complement', 'district',
  'city', 'state', 'lat', 'lng',
  'freight_table', 'freight_per_km', 'min_freight', 'free_freight_threshold',
  'max_delivery_radius_km', 'estimated_delivery_minutes',
  'delivery_enabled', 'delivery_city', 'delivery_state',
];

export const storeSettingsRepository = {
  // Retorna o único registro (singleton). Cria com defaults se não existir.
  async getSingleton(client = pool) {
    const { rows } = await client.query(
      'SELECT * FROM store_settings ORDER BY created_date ASC LIMIT 1'
    );
    return rows[0] || null;
  },

  async create(data, client = pool) {
    const provided = ALLOWED_FIELDS.filter((f) => data[f] !== undefined);
    if (provided.length === 0) {
      const { rows } = await client.query('INSERT INTO store_settings DEFAULT VALUES RETURNING *');
      return rows[0];
    }
    const values = provided.map((f) => data[f]);
    const placeholders = provided.map((_, i) => `$${i + 1}`).join(', ');
    const columns = provided.join(', ');

    const { rows } = await client.query(
      `INSERT INTO store_settings (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return rows[0];
  },

  async update(id, data, client = pool) {
    const provided = ALLOWED_FIELDS.filter((f) => data[f] !== undefined);
    if (provided.length === 0) {
      const { rows } = await client.query('SELECT * FROM store_settings WHERE id = $1', [id]);
      return rows[0] || null;
    }
    const setClauses = provided.map((f, i) => `${f} = $${i + 1}`);
    const values = provided.map((f) => {
      // freight_table é JSONB — serializar se for objeto/array
      if (f === 'freight_table' && typeof data[f] === 'object') {
        return JSON.stringify(data[f]);
      }
      return data[f];
    });
    values.push(id);
    const { rows } = await client.query(
      `UPDATE store_settings SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  },
};