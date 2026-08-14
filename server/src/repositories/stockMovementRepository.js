// ============================================================
// stockMovementRepository.js — Acesso a dados da tabela stock_movements
// ============================================================
// Campos: product_id, product_name, type (entrada/saida),
// quantity, date, reason, stock_after.
// Aceita `client` para operar dentro de transações.
// ============================================================

import { pool } from '../db/index.js';

export const stockMovementRepository = {
  async create(data, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO stock_movements
         (product_id, product_name, type, quantity, date, reason, stock_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.product_id,
        data.product_name || null,
        data.type,
        data.quantity,
        data.date,
        data.reason || null,
        data.stock_after,
      ]
    );
    return rows[0];
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM stock_movements WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findAll({ productId, type, dateFrom, dateTo, limit = 500, client = pool } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (productId) {
      conditions.push(`product_id = $${idx++}`);
      params.push(productId);
    }
    if (type) {
      conditions.push(`type = $${idx++}`);
      params.push(type);
    }
    if (dateFrom) {
      conditions.push(`date >= $${idx++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`date <= $${idx++}`);
      params.push(dateTo);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);
    const { rows } = await client.query(
      `SELECT * FROM stock_movements ${where} ORDER BY created_date DESC LIMIT $${idx++}`,
      params
    );
    return rows;
  },

  async findByProductId(productId, client = pool) {
    const { rows } = await client.query(
      'SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY created_date DESC',
      [productId]
    );
    return rows;
  },
};