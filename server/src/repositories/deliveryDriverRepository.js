// ============================================================
// deliveryDriverRepository.js — Acesso a dados da tabela delivery_drivers (motoboys)
// ============================================================
// Colunas SAFE não incluem password_hash nem password_salt.
// Aceita `client` para operar dentro de transações.
// ============================================================

import { pool } from '../db/index.js';

const SAFE_COLS =
  'id, name, phone, login, vehicle_type, plate, status, rating, total_deliveries, active, created_date, updated_date';

const ALLOWED_FIELDS = [
  'name', 'phone', 'login', 'vehicle_type', 'plate',
  'status', 'rating', 'total_deliveries', 'active',
];

export const deliveryDriverRepository = {
  async findByLogin(login, client = pool) {
    const { rows } = await client.query('SELECT * FROM delivery_drivers WHERE login = $1', [login]);
    return rows[0] || null;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM delivery_drivers WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByIdSafe(id, client = pool) {
    const { rows } = await client.query(`SELECT ${SAFE_COLS} FROM delivery_drivers WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async findAll({ active, status, limit = 100, offset = 0 } = {}, client = pool) {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (active !== undefined) {
      conditions.push(`active = $${idx++}`);
      params.push(active);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows } = await client.query(
      `SELECT ${SAFE_COLS} FROM delivery_drivers ${where} ORDER BY created_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  async create(data, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO delivery_drivers
         (name, phone, login, password_hash, password_salt, vehicle_type, plate, status, rating, total_deliveries, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${SAFE_COLS}`,
      [
        data.name,
        data.phone,
        data.login,
        data.password_hash,
        data.password_salt || null,
        data.vehicle_type || 'moto',
        data.plate || null,
        data.status || 'disponivel',
        data.rating || 5.0,
        data.total_deliveries || 0,
        data.active !== undefined ? data.active : true,
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
    if (data.password_hash !== undefined) {
      fields.push(`password_hash = $${idx++}`);
      values.push(data.password_hash);
    }
    if (fields.length === 0) {
      return this.findByIdSafe(id, client);
    }
    values.push(id);
    const { rows } = await client.query(
      `UPDATE delivery_drivers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${SAFE_COLS}`,
      values
    );
    return rows[0] || null;
  },

  async delete(id, client = pool) {
    const { rows } = await client.query(
      'DELETE FROM delivery_drivers WHERE id = $1 RETURNING id',
      [id]
    );
    return rows.length > 0;
  },
};