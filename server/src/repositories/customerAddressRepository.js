// ============================================================
// customerAddressRepository.js — Acesso a dados da tabela customer_addresses
// ============================================================

import { pool } from '../db/index.js';

export const customerAddressRepository = {
  async findByCustomerId(customerId, client = pool) {
    const { rows } = await client.query(
      'SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY created_date DESC',
      [customerId]
    );
    return rows;
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
};