// ============================================================
// deliveryDriverRepository.js — Acesso a dados da tabela delivery_drivers (motoboys)
// ============================================================

import { pool } from '../db/index.js';

// Colunas públicas (sem password_hash nem password_salt)
const SAFE_COLS =
  'id, name, phone, login, vehicle_type, plate, status, rating, total_deliveries, active, created_date, updated_date';

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
};