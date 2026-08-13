// ============================================================
// couponRepository.js — Acesso a dados da tabela coupons
// ============================================================
// Campos: code (único, maiúsculo), discount_percent, max_uses,
// per_customer_limit, min_order_value, start_date, end_date,
// active, used_count, used_by (JSONB array).
// ============================================================

import { pool } from '../db/index.js';

const ALLOWED_FIELDS = [
  'code', 'discount_percent', 'max_uses', 'per_customer_limit',
  'min_order_value', 'start_date', 'end_date', 'active',
  'used_count', 'used_by',
];

export const couponRepository = {
  async findAll(client = pool) {
    const { rows } = await client.query('SELECT * FROM coupons ORDER BY created_date DESC');
    return rows;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM coupons WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByCode(code, client = pool) {
    const { rows } = await client.query('SELECT * FROM coupons WHERE code = $1', [code]);
    return rows[0] || null;
  },

  async create(data, client = pool) {
    const provided = ALLOWED_FIELDS.filter((f) => data[f] !== undefined);
    const values = provided.map((f) => {
      if (f === 'used_by' && Array.isArray(data[f])) return JSON.stringify(data[f]);
      return data[f];
    });
    const placeholders = provided.map((_, i) => `$${i + 1}`).join(', ');
    const columns = provided.join(', ');

    const { rows } = await client.query(
      `INSERT INTO coupons (${columns}) VALUES (${placeholders}) RETURNING *`,
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
    const values = provided.map((f) => {
      if (f === 'used_by' && Array.isArray(data[f])) return JSON.stringify(data[f]);
      return data[f];
    });
    values.push(id);
    const { rows } = await client.query(
      `UPDATE coupons SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id, client = pool) {
    const { rowCount } = await client.query('DELETE FROM coupons WHERE id = $1', [id]);
    return rowCount > 0;
  },
};