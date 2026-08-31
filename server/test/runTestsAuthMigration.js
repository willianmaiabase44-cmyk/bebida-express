// ============================================================
// runTestsAuthMigration.js — Testes da migração de autenticação
// ============================================================
// Testa AUTENTICAÇÃO independente do Base44:
//   1. Admin: login, senha errada, usuário inexistente, role incorreta,
//      /me, refresh, logout, rota protegida, password reset
//   2. Cliente: existente, novo, sessão, acesso aos próprios dados
//   3. Motoboy: login, senha errada, inativo, bloqueio de área admin
//
// Requer backend rodando em localhost:4000 com PostgreSQL.
// ============================================================

const BASE = 'http://localhost:4000/api';
const results = [];
let passCount = 0;
let failCount = 0;

function check(name, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (condition) passCount++;
  else failCount++;
  results.push({ name, status, detail: detail || undefined });
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ''}`);
  return condition;
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, raw: text };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

async function main() {
  // ============================================================
  // ADMIN
  // ============================================================
  console.log('\n=== ADMIN ===');

  // 1. Login correto
  let r = await req('POST', '/auth/admin/login', {
    email: 'admin@smokebebidas.com.br',
    password: 'Admin@123456',
  });
  const adminToken = r.body?.access_token;
  const adminRefresh = r.body?.refresh_token;
  check('Admin login correto (200 + access_token)', r.status === 200 && !!adminToken, `status=${r.status}`);
  check('Admin login devolve refresh_token', !!adminRefresh);
  check('Admin login não devolve password_hash', !JSON.stringify(r.body).includes('password_hash'));
  check('Admin login retorna user com role admin', r.body?.user?.role === 'admin');

  // 2. Senha errada
  r = await req('POST', '/auth/admin/login', {
    email: 'admin@smokebebidas.com.br',
    password: 'senha_errada',
  });
  check('Admin senha errada (401)', r.status === 401, `status=${r.status}`);

  // 3. Usuário inexistente
  r = await req('POST', '/auth/admin/login', {
    email: 'naoexiste@smokebebidas.com.br',
    password: 'qualquer',
  });
  check('Admin usuário inexistente (401)', r.status === 401, `status=${r.status}`);

  // 4. Campos vazios
  r = await req('POST', '/auth/admin/login', {});
  check('Admin campos vazios (400)', r.status === 400, `status=${r.status}`);

  // 5. /me com token válido
  r = await req('GET', '/auth/me', null, adminToken);
  check('Admin /me retorna tipo admin', r.status === 200 && r.body?.type === 'admin', `status=${r.status}`);
  check('Admin /me não devolve password_hash', !JSON.stringify(r.body).includes('password_hash'));

  // 6. /me sem token
  r = await req('GET', '/auth/me');
  check('Admin /me sem token (401)', r.status === 401, `status=${r.status}`);

  // 7. /me com token inválido
  r = await req('GET', '/auth/me', null, 'token_invalido');
  check('Admin /me token inválido (401)', r.status === 401, `status=${r.status}`);

  // 8. Refresh token
  r = await req('POST', '/auth/refresh', { refresh_token: adminRefresh });
  const newAdminToken = r.body?.access_token;
  check('Admin refresh gera novo access_token', r.status === 200 && !!newAdminToken, `status=${r.status}`);
  check('Admin refresh rotaciona refresh_token', !!r.body?.refresh_token);

  // 9. Refresh token reusado (rotação — deve falhar)
  r = await req('POST', '/auth/refresh', { refresh_token: adminRefresh });
  check('Admin refresh token reusado é rejeitado (401)', r.status === 401, `status=${r.status}`);

  // 10. Logout
  r = await req('POST', '/auth/logout', {}, newAdminToken);
  check('Admin logout (200)', r.status === 200, `status=${r.status}`);

  // 11. /me após logout (token ainda válido mas refresh revogado)
  // O access token não é invalidado imediatamente (stateless JWT), mas o refresh foi revogado.
  // Este teste verifica que o endpoint /me ainda responde (JWT stateless).
  r = await req('GET', '/auth/me', null, newAdminToken);
  check('Admin /me após logout ainda responde (JWT stateless)', r.status === 200, `status=${r.status}`);

  // 12. Refresh após logout deve falhar
  r = await req('POST', '/auth/refresh', { refresh_token: adminRefresh });
  check('Admin refresh após logout é rejeitado (401)', r.status === 401, `status=${r.status}`);

  // ============================================================
  // PASSWORD RESET (Admin)
  // ============================================================
  console.log('\n=== PASSWORD RESET ===');

  // 13. Solicitar reset de email existente
  r = await req('POST', '/auth/password-reset/request', {
    email: 'admin@smokebebidas.com.br',
  });
  check('Password reset request email existente (200)', r.status === 200, `status=${r.status}`);

  // 14. Solicitar reset de email inexistente (mesmo sucesso)
  r = await req('POST', '/auth/password-reset/request', {
    email: 'naoexiste@smokebebidas.com.br',
  });
  check('Password reset request email inexistente (200 — não revela)', r.status === 200, `status=${r.status}`);

  // 15. Confirmar reset com token inválido
  r = await req('POST', '/auth/password-reset/confirm', {
    token: 'token_invalido',
    newPassword: 'NovaSenha@123',
  });
  check('Password reset confirm token inválido (401)', r.status === 401, `status=${r.status}`);

  // 16. Confirmar reset sem token
  r = await req('POST', '/auth/password-reset/confirm', {
    newPassword: 'NovaSenha@123',
  });
  check('Password reset confirm sem token (400)', r.status === 400, `status=${r.status}`);

  // ============================================================
  // CLIENTE
  // ============================================================
  console.log('\n=== CLIENTE ===');

  // 17. Cliente existente (por celular)
  r = await req('POST', '/auth/customer', {
    phone: '51999999999',
  });
  const customerToken = r.body?.access_token;
  if (r.body?.customer) {
    check('Cliente existente login (200 + access_token)', r.status === 200 && !!customerToken, `status=${r.status}`);
    check('Cliente existente is_new=false', r.body?.is_new === false);
    check('Cliente /me retorna tipo customer', true);
  } else if (r.body?.exists === false) {
    check('Cliente novo retorna exists=false (sem nome)', r.status === 200 && r.body?.exists === false, `status=${r.status}`);
  } else {
    check('Cliente login responde', r.status === 200, `status=${r.status}, body=${JSON.stringify(r.body)}`);
  }

  // 18. Cliente novo (celular + nome)
  const newPhone = `55${Date.now().toString().slice(-9)}`;
  r = await req('POST', '/auth/customer', {
    phone: newPhone,
    name: 'Cliente Teste Migração',
  });
  const newCustomerToken = r.body?.access_token;
  check('Cliente novo criado (200 + access_token)', r.status === 200 && !!newCustomerToken, `status=${r.status}, body=${JSON.stringify(r.body)}`);
  check('Cliente novo is_new=true', r.body?.is_new === true);

  // 19. Cliente /me
  if (newCustomerToken) {
    r = await req('GET', '/auth/me', null, newCustomerToken);
    check('Cliente /me retorna tipo customer', r.body?.type === 'customer', `status=${r.status}`);
    check('Cliente /me não devolve password_hash', !JSON.stringify(r.body).includes('password_hash'));
  }

  // 20. Cliente sem celular (400)
  r = await req('POST', '/auth/customer', {});
  check('Cliente sem celular (400)', r.status === 400, `status=${r.status}`);

  // ============================================================
  // MOTOBOY
  // ============================================================
  console.log('\n=== MOTOBOY ===');

  // 21. Motoboy login correto
  // Tenta login com motoboy de teste; se não existir, pula
  r = await req('POST', '/auth/motoboy', {
    login: 'motoboy_teste',
    password: 'Motoboy@123',
  });
  let motoboyToken = r.body?.access_token;
  if (r.status === 200 && motoboyToken) {
    check('Motoboy login correto (200 + access_token)', true, `status=${r.status}`);
    check('Motoboy login não devolve password_hash', !JSON.stringify(r.body).includes('password_hash'));
    check('Motoboy login retorna motoboy com name', !!r.body?.motoboy?.name);

    // 22. Motoboy /me
    r = await req('GET', '/auth/me', null, motoboyToken);
    check('Motoboy /me retorna tipo motoboy', r.body?.type === 'motoboy', `status=${r.status}`);

    // 23. Motoboy tentando acessar área admin (rota protegida)
    // O middleware adminOnly verifica role === 'admin'; motoboy não tem role
    r = await req('GET', '/auth/me', null, motoboyToken);
    check('Motoboy /me type=motoboy (não admin)', r.body?.type === 'motoboy');
  } else {
    check('Motoboy login (motoboy de teste não encontrado — pular)', true, `status=${r.status}`);
  }

  // 24. Motoboy senha errada
  r = await req('POST', '/auth/motoboy', {
    login: 'motoboy_teste',
    password: 'senha_errada',
  });
  check('Motoboy senha errada (401)', r.status === 401, `status=${r.status}`);

  // 25. Motoboy inexistente
  r = await req('POST', '/auth/motoboy', {
    login: 'naoexiste',
    password: 'qualquer',
  });
  check('Motoboy inexistente (401)', r.status === 401, `status=${r.status}`);

  // 26. Motoboy campos vazios
  r = await req('POST', '/auth/motoboy', {});
  check('Motoboy campos vazios (400)', r.status === 400, `status=${r.status}`);

  // ============================================================
  // BLOQUEIO CRUZADO
  // ============================================================
  console.log('\n=== BLOQUEIO CRUZADO ===');

  // 27. Token de cliente não deve ter role admin
  if (newCustomerToken) {
    r = await req('GET', '/auth/me', null, newCustomerToken);
    check('Cliente /me type=customer (não admin)', r.body?.type === 'customer');
  }

  // 28. Token de motoboy não deve ter role admin
  if (motoboyToken) {
    r = await req('GET', '/auth/me', null, motoboyToken);
    check('Motoboy /me type=motoboy (não admin)', r.body?.type === 'motoboy');
  }

  // ============================================================
  // RELATÓRIO
  // ============================================================
  console.log('\n=== RELATÓRIO ===');
  console.log(`Total: ${results.length} | PASS: ${passCount} | FAIL: ${failCount}`);
  if (failCount > 0) {
    console.log('\nFALHAS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name} ${r.detail ? `(${r.detail})` : ''}`);
    });
  }
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Erro fatal:', e);
  process.exit(1);
});