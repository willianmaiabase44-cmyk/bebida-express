// ============================================================
// resetMotoboyPassword.js — Redefinição segura de senha de motoboy
// ============================================================
// Após importar o backup, o hash PBKDF2 do Base44 não é compatível
// com bcrypt. Este script gera um novo hash bcrypt para um motoboy.
//
// USO:
//   node server/src/db/resetMotoboyPassword.js <login> <nova_senha>
//
// EXEMPLO:
//   node server/src/db/resetMotoboyPassword.js motoboy1 novaSenha123
// ============================================================

import 'dotenv/config';
import pg from 'pg';
import { config } from '../config/index.js';
import { hashPasswordWithSalt } from '../utils/password.js';

async function main() {
  const [login, newPassword] = process.argv.slice(2);

  if (!login || !newPassword) {
    console.error('Uso: node server/src/db/resetMotoboyPassword.js <login> <nova_senha>');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('❌ A senha deve ter no mínimo 6 caracteres');
    process.exit(1);
  }

  const poolConfig = config.database.connectionString
    ? { connectionString: config.database.connectionString }
    : {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
      };

  const client = new pg.Client(poolConfig);

  try {
    await client.connect();

    const { rows } = await client.query(
      'SELECT id, name, login FROM delivery_drivers WHERE login = $1',
      [login]
    );

    if (rows.length === 0) {
      console.error(`❌ Motoboy não encontrado: ${login}`);
      process.exit(1);
    }

    const driver = rows[0];
    console.log(`🔄 Redefinindo senha para: ${driver.name} (${driver.login})`);

    const { hash, salt } = await hashPasswordWithSalt(newPassword);

    await client.query(
      'UPDATE delivery_drivers SET password_hash = $1, password_salt = $2, updated_date = NOW() WHERE id = $3',
      [hash, salt, driver.id]
    );

    console.log('✅ Senha redefinida com sucesso (hash bcrypt)');
    console.log('   O motoboy já pode fazer login com a nova senha.');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();