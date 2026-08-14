// ============================================================
// supplierRepository.js — Acesso a dados da tabela suppliers
// ============================================================
// Campos: name, contact_name, phone, email, cnpj, category,
// address, notes, active.
// ============================================================

import { pool } from '../db/index.js';

const ALLOWED_FIELDS = [
  'name', 'contact_name', 'phone', 'email', 'cnpj',
  'category', 'address', 'notes', 'active',
];

export const supplierRepository = {
  async findAll({ active, client = pool } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (active !== undefined) {
      conditions.push(`active = $${idx++}`);
      params.push(active);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await client.query(
      `SELECT * FROM suppliers ${where} ORDER BY name ASC`,
      params
    );
    return rows;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM suppliers WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data, client = pool) {
    const provided = ALLOWED_FIELDS.filter((f) => data[f] !== undefined);
    const values = provided.map((f) => data[f]);
    const placeholders = provided.map((_, i) => `$${i + 1}`).join(', ');
    const columns = provided.join(', ');

    const { rows } = await client.query(
      `INSERT INTO suppliers (${columns}) VALUES (${placeholders}) RETURNING *`,
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
      `UPDATE suppliers SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id, client = pool) {
    const { rowCount } = await client.query('DELETE FROM suppliers WHERE id = $1', [id]);
    return rowCount > 0;
  },
};