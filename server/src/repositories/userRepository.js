// ============================================================
// userRepository.js — Acesso a dados da tabela users (admins)
// ============================================================
// SQL fica SOMENTE aqui. Services chamam estes métodos.
// client = pool por padrão; comTransaction passa o client da transação.
// ============================================================

import { pool } from '../db/index.js';

// Colunas públicas (sem password_hash)
const SAFE_COLS = 'id, email, full_name, phone, role, created_date, updated_date';

export const userRepository = {
  async findByEmail(email, client = pool) {
    const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByIdSafe(id, client = pool) {
    const { rows } = await client.query(`SELECT ${SAFE_COLS} FROM users WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async createAdmin({ email, full_name, password_hash, role = 'admin' }, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO users (email, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SAFE_COLS}`,
      [email, full_name || null, password_hash, role]
    );
    return rows[0];
  },
};