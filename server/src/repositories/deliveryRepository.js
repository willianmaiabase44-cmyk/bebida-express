// ============================================================
// deliveryRepository.js — Acesso a dados da tabela deliveries
// ============================================================
// Entidade Delivery (NÃO confundir com Order).
// Aceita `client` para operar dentro de transações.
// ============================================================

import { pool } from '../db/index.js';

const ALLOWED_FIELDS = [
  'client_name', 'client_phone', 'address', 'reference', 'items_description',
  'total', 'motoboy_id', 'motoboy_name', 'status', 'lat', 'lng', 'distance', 'duration', 'date',
];

export const deliveryRepository = {
  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM deliveries WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findAll({ status, motoboy_id, limit = 100, offset = 0 } = {}, client = pool) {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (motoboy_id) {
      conditions.push(`motoboy_id = $${idx++}`);
      params.push(motoboy_id);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows } = await client.query(
      `SELECT * FROM deliveries ${where} ORDER BY created_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async create(data, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO deliveries
         (client_name, client_phone, address, reference, items_description, total,
          motoboy_id, motoboy_name, status, lat, lng, distance, duration, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        data.client_name,
        data.client_phone || null,
        data.address,
        data.reference || null,
        data.items_description || null,
        data.total || 0,
        data.motoboy_id || null,
        data.motoboy_name || null,
        data.status || 'pendente',
        data.lat || null,
        data.lng || null,
        data.distance || null,
        data.duration || null,
        data.date,
      ]
    );
    return rows[0];
  },

  async update(id, data, client = pool) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key of ALLOWED_FIELDS) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) {
      return this.findById(id, client);
    }
    values.push(id);
    const { rows } = await client.query(
      `UPDATE deliveries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async updateStatus(id, status, client = pool) {
    const { rows } = await client.query(
      'UPDATE deliveries SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );
    return rows[0] || null;
  },

  async delete(id, client = pool) {
    const { rows } = await client.query('DELETE FROM deliveries WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },
};