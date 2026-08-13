// ============================================================
// seedTestMotoboy.js — Cria motoboys de teste para validação
// ============================================================
// Cria:
//   - motoboy_test / motoboy123 (ativo)
//   - motoboy_inactive / motoboy123 (inativo)
// Idempotente (ON CONFLICT).
// ============================================================

import { pool } from './index.js';
import { hashPassword } from '../utils/password.js';

async function seedTestMotoboy() {
  const hash = await hashPassword('motoboy123');

  await pool.query(
    `INSERT INTO delivery_drivers (name, phone, login, password_hash, vehicle_type, status, active)
     VALUES ('Motoboy Teste', '51999999999', 'motoboy_test', $1, 'moto', 'disponivel', true)
     ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = true`,
    [hash]
  );

  await pool.query(
    `INSERT INTO delivery_drivers (name, phone, login, password_hash, vehicle_type, status, active)
     VALUES ('Motoboy Inativo', '51888888888', 'motoboy_inactive', $1, 'moto', 'offline', false)
     ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = false`,
    [hash]
  );

  console.log('✅ Motoboys de teste criados (motoboy_test / motoboy_inactive)');
  process.exit(0);
}

seedTestMotoboy().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});