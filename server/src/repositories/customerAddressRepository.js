// ============================================================
// customerAddressRepository.js — Acesso a dados da tabela customer_addresses
// ============================================================
// Campos: customer_id, label, cep, street, number, complement,
// district, city, state, reference, lat, lng.
// ============================================================

import { pool } from '../db/index.js';

const ALLOWED_FIELDS = [
  'label', 'cep', 'street', 'number', 'complement',
  'district', 'city', 'state', 'reference', 'lat', 'lng',
];

export const customerAddressRepository = {
  async findByCustomerId(customerId, client = pool) {
    const { rows } = await client.query(
      'SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY created_date DESC',
      [customerId]
    );
    return rows;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM customer_addresses WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO customer_addresses
         (customer_id, label, cep, street, number, complement, district, city, state, reference, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.customer_id,
        data.label || 'Casa',
        data.cep || null,
        data.street,
        data.number,
        data.complement || null,
        data.district,
        data.city,
        data.state,
        data.reference || null,
        data.lat || null,
        data.lng || null,
      ]
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
      `UPDATE customer_addresses SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id, client = pool) {
    const { rowCount } = await client.query('DELETE FROM customer_addresses WHERE id = $1', [id]);
    return rowCount > 0;
  },
};