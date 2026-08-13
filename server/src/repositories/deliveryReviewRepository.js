// ============================================================
// deliveryReviewRepository.js — Acesso a dados da tabela delivery_reviews
// ============================================================
// Avaliações de entrega feitas por clientes.
// Aceita `client` para operar dentro de transações.
// ============================================================

import { pool } from '../db/index.js';

export const deliveryReviewRepository = {
  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM delivery_reviews WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findAll({ motoboy_id, limit = 200, offset = 0 } = {}, client = pool) {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (motoboy_id) {
      conditions.push(`motoboy_id = $${idx++}`);
      params.push(motoboy_id);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows } = await client.query(
      `SELECT * FROM delivery_reviews ${where} ORDER BY created_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async findByMotoboyId(motoboyId, client = pool) {
    const { rows } = await client.query(
      'SELECT * FROM delivery_reviews WHERE motoboy_id = $1 ORDER BY created_date DESC',
      [motoboyId]
    );
    return rows;
  },

  async create(data, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO delivery_reviews
         (order_id, order_number, customer_id, customer_name, motoboy_id, motoboy_name, rating, comment, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.order_id,
        data.order_number || null,
        data.customer_id,
        data.customer_name || null,
        data.motoboy_id,
        data.motoboy_name || null,
        data.rating,
        data.comment || null,
        data.date,
      ]
    );
    return rows[0];
  },

  async delete(id, client = pool) {
    const { rows } = await client.query('DELETE FROM delivery_reviews WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },
};