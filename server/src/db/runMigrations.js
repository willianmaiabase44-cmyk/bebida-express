import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
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
    console.log('🔗 Conectado ao PostgreSQL');

    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  Pasta de migrations não encontrada:', migrationsDir);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Cria tabela de controle de migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const already = await client.query('SELECT 1 FROM _migrations WHERE filename = $1', [file]);
      if (already.rows.length > 0) {
        console.log(`⏭️  ${file} — já aplicada`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ ${file} — aplicada`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ ${file} — falhou:`, err.message);
        throw err;
      }
    }

    console.log('🎉 Migrations concluídas');
  } catch (err) {
    console.error('Erro ao executar migrations:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();