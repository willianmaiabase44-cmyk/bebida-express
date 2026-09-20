// ============================================================
// resetMotoboyPassword.js — Redefinição segura de senha de motoboy
// ============================================================
// Após importar o backup, o hash PBKDF2 do Base44 não é compatível
// com bcrypt. Este script gera um novo hash bcrypt para um motoboy.
//
// USO:
//   node server/src/db/resetMotoboyPassword.js <login>
//
// A senha é solicitada de forma INTERATIVA e MASCARADA (asteriscos),
// nunca via linha de comando — para evitar exposição no histórico
// do shell, na lista de processos ou em logs.
// ============================================================

import 'dotenv/config';
import readline from 'readline';
import pg from 'pg';
import { config } from '../config/index.js';
import { hashPasswordWithSalt } from '../utils/password.js';

// Pergunta simples (resposta visível) — usada para login/confirmação
function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Pergunta de senha (entrada mascarada com asteriscos)
function askPassword(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    // Substitui a saída para mascarar a senha com asteriscos
    rl._writeToOutput = (chunk) => {
      if (chunk.startsWith(question)) {
        process.stdout.write(question);
        const rest = chunk.slice(question.length);
        if (rest) {
          process.stdout.write('*'.repeat(rest.replace(/[\r\n]/g, '').length));
        }
        if (rest.includes('\n') || rest.includes('\r')) {
          process.stdout.write('\n');
        }
        return;
      }
      if (chunk.includes('\n') || chunk.includes('\r')) {
        process.stdout.write('\n');
        return;
      }
      process.stdout.write('*');
    };

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const [login] = process.argv.slice(2);

  if (!login) {
    console.error('Uso: node server/src/db/resetMotoboyPassword.js <login>');
    console.error('A senha será solicitada de forma interativa (não visível).');
    process.exit(1);
  }

  console.log('\n🔒 Redefinição de senha do motoboy');
  console.log('   A senha NÃO aparece na tela nem no histórico do shell.\n');

  // Solicita a senha de forma interativa e mascarada
  const password = await askPassword('   Nova senha (mín. 6 caracteres): ');

  if (password.length < 6) {
    console.error('\n❌ A senha deve ter no mínimo 6 caracteres.');
    process.exit(1);
  }

  // Confirmação — previne erros de digitação
  const confirmPassword = await askPassword('   Confirme a senha:         ');

  if (password !== confirmPassword) {
    console.error('\n❌ As senhas não coincidem. Tente novamente.');
    process.exit(1);
  }

  console.log('');

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

    const { hash, salt } = await hashPasswordWithSalt(password);

    await client.query(
      'UPDATE delivery_drivers SET password_hash = $1, password_salt = $2, updated_date = NOW() WHERE id = $3',
      [hash, salt, driver.id]
    );

    console.log('✅ Senha redefinida com sucesso (hash bcrypt).');
    console.log('   O motoboy já pode fazer login com a nova senha.');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();