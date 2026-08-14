// ============================================================
// promotionRepository.js — Acesso a dados da tabela promotions
// ============================================================
// Campos: product_id, product_name, original_price, promo_price,
// start_date, end_date, banner_url, active.
// ============================================================

import { pool } from '../db/index.js';

const ALLOWED_FIELDS = [
  'product_id', 'product_name', 'original_price', 'promo_price',
  'start_date', 'end_date', 'banner_url', 'active',
];

export const promotionRepository = {
  // Lista todas (admin) ou apenas ativas e vigentes (público)
  async findAll({ activeOnly = false, client = pool } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (activeOnly) {
      conditions.push('active = true');
      const today = new Date().toISOString().split('T')[0];
      conditions.push(`start_date <= $${idx++}`);
      params.push(today);
      conditions.push(`end_date >= $${idx++}`);
      params.push(today);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await client.query(
      `SELECT * FROM promotions ${where} ORDER BY created_date DESC`,
      params
    );
    return rows;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM promotions WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data, client = pool) {
    const provided = ALLOWED_FIELDS.filter((f) => data[f] !== undefined);
    const values = provided.map((f) => data[f]);
    const placeholders = provided.map((_, i) => `$${i + 1}`).join(', ');
    const columns = provided.join(', ');

    const { rows } = await client.query(
      `INSERT INTO promotions (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return rows[0];
  },

  async update(id, data, client = pool) {
    const provided = ALLOWED_FIELDS.filter((f) => data[f] !== undefined);
    if (provided.length === 0) {
      return this.findById(id, client);
    }
    const setClauses = provided.map((f, i) => `${f} = $${i + 1}`);
    const values = provided.map((f) => data[f]);
    values.push(id);
    const { rows } = await client.query(
      `UPDATE promotions SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id, client = pool) {
    const { rowCount } = await client.query('DELETE FROM promotions WHERE id = $1', [id]);
    return rowCount > 0;
  },
};