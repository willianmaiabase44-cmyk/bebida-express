// ============================================================
// refreshTokenRepository.js — Acesso a dados da tabela refresh_tokens
// ============================================================
// Tokens são armazenados como SHA-256 (nunca em texto puro).
// Aceita `client` para operar dentro de transações.
// ============================================================

import crypto from 'crypto';
import { pool } from '../db/index.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const refreshTokenRepository = {
  // Cria um novo refresh token e retorna o token em texto puro + registro
  async create({ user_id, user_type, expires_at }, client = pool) {
    const token = crypto.randomBytes(40).toString('hex');
    const tokenHash = hashToken(token);
    const { rows } = await client.query(
      `INSERT INTO refresh_tokens (user_id, user_type, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, user_type, expires_at, created_date`,
      [user_id, user_type, tokenHash, expires_at]
    );
    return { token, record: rows[0] };
  },

  // Busca um refresh token ativo (não revogado, não expirado)
  async findValid(token, client = pool) {
    const tokenHash = hashToken(token);
    const { rows } = await client.query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  // Revoga um refresh token específico
  async revoke(token, client = pool) {
    const tokenHash = hashToken(token);
    await client.query(
      'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
      [tokenHash]
    );
  },

  // Revoga todos os refresh tokens de um usuário
  async revokeByUserId(user_id, user_type, client = pool) {
    await client.query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND user_type = $2 AND revoked = false',
      [user_id, user_type]
    );
  },

  // Limpeza de tokens expirados (pode ser chamada periodicamente)
  async cleanExpired(client = pool) {
    await client.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
  },
};