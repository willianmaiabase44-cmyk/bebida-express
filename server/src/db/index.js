import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

const poolConfig = config.database.connectionString
  ? { connectionString: config.database.connectionString }
  : {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err);
});

// Query simples
export async function query(text, params) {
  return pool.query(text, params);
}

// Testa conexão real com PostgreSQL
export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as now');
    return { ok: true, timestamp: res.rows[0].now };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ============================================================
// Helper para TRANSAÇÕES atômicas
// ============================================================
// Uso futuro (Etapa 2) na criação de pedidos:
//
//   const result = await withTransaction(async (client) => {
//     // 1. SELECT ... FOR UPDATE nos produtos (lock de estoque)
//     const { rows: products } = await client.query(
//       'SELECT * FROM products WHERE id = ANY($1) FOR UPDATE',
//       [productIds]
//     );
//     // 2. Validar preços e estoque
//     // 3. Validar cupom (SELECT ... FOR UPDATE)
//     // 4. Criar pedido (order_number via nextval('order_number_seq'))
//     // 5. UPDATE products SET stock = stock - qty
//     // 6. INSERT INTO stock_movements
//     // 7. UPDATE coupons SET used_count = used_count + 1
//     return { orderId };
//   });
//
// Em caso de qualquer erro, ROLLBACK automático.
// ============================================================
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}