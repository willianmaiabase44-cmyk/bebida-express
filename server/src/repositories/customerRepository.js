// ============================================================
// customerRepository.js — Acesso a dados da tabela customers
// ============================================================

import { pool } from '../db/index.js';

export const customerRepository = {
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
};