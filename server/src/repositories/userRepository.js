// ============================================================
// userRepository.js — Acesso a dados da tabela users (admins)
// ============================================================
// SQL fica SOMENTE aqui. Services chamam estes métodos.
// client = pool por padrão; comTransaction passa o client da transação.
// ============================================================

import { pool } from '../db/index.js';
import crypto from 'crypto';

// Colunas públicas (sem password_hash)
const SAFE_COLS = 'id, email, full_name, phone, role, created_date, updated_date';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

  // --- Password reset ---

  async updatePassword(id, password_hash, client = pool) {
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, id]);
    return true;
  },

  async createPasswordResetToken(user_id, expires_at, client = pool) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user_id, tokenHash, expires_at]
    );
    return token;
  },

  async findValidPasswordResetToken(token, client = pool) {
    const tokenHash = hashToken(token);
    const { rows } = await client.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used = false AND expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  async markPasswordResetTokenUsed(token, client = pool) {
    const tokenHash = hashToken(token);
    await client.query('UPDATE password_reset_tokens SET used = true WHERE token_hash = $1', [tokenHash]);
  },
};