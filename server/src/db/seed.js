// ============================================================
// seed.js — Seed de administrador inicial
// ============================================================
// Cria o primeiro admin a partir de variáveis de ambiente:
//   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
// Idempotente: se o admin já existe, apenas loga e sai.
// Uso: npm run seed
// ============================================================

import { pool } from './index.js';
import { hashPassword } from '../utils/password.js';

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME || 'Administrador';

  if (!email || !password) {
    console.log('⚠️  ADMIN_EMAIL e ADMIN_PASSWORD não definidos — seed de admin pulado');
    return;
  }

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length > 0) {
    console.log(`✅ Admin já existe: ${email}`);
    return;
  }

  const hash = await hashPassword(password);
  await pool.query(
    `INSERT INTO users (email, full_name, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    [email, fullName, hash]
  );
  console.log(`✅ Admin criado: ${email}`);
}

// Executa se chamado diretamente: node src/db/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  seedAdmin()
    .then(() => {
      console.log('🎉 Seed concluído');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Erro no seed:', err.message);
      process.exit(1);
    });
}