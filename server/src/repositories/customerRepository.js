// ============================================================
// customerRepository.js — Acesso a dados da tabela customers
// ============================================================
// Campos: name, phone, email. Phone é normalizado e único.
// ============================================================

import { pool } from '../db/index.js';

const ALLOWED_FIELDS = ['name', 'phone', 'email'];

export const customerRepository = {
  async findAll({ search, client = pool } = {}) {
    if (search) {
      const { rows } = await client.query(
        `SELECT * FROM customers
         WHERE name ILIKE $1 OR phone ILIKE $1
         ORDER BY created_date DESC`,
        [`%${search}%`]
      );
      return rows;
    }
    const { rows } = await client.query(
      'SELECT * FROM customers ORDER BY created_date DESC'
    );
    return rows;
  },

  async findByPhone(phone, client = pool) {
    const { rows } = await client.query('SELECT * FROM customers WHERE phone = $1', [phone]);
    return rows[0] || null;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM customers WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create({ name, phone, email }, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO customers (name, phone, email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, phone, email || null]
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
      `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id, client = pool) {
    const { rowCount } = await client.query('DELETE FROM customers WHERE id = $1', [id]);
    return rowCount > 0;
  },
};