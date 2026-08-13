// ============================================================
// runTests.js — Suite de testes da Etapa 2
// ============================================================
// Testa AUTENTICAÇÃO (admin, cliente, motoboy), PRODUTOS e UPLOAD
// contra o backend real (localhost:4000) com PostgreSQL.
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
  // AUTH ADMIN
  // ============================================================
  console.log('\n=== AUTH ADMIN ===');

  // 1. Login correto
  let r = await req('POST', '/auth/admin/login', {
    email: 'admin@smokebebidas.com.br',
    password: 'Admin@123456',
  });
  const adminToken = r.body?.token;
  check('Admin login correto (200 + token)', r.status === 200 && !!adminToken, `status=${r.status}`);
  check('Admin login não devolve password_hash', !JSON.stringify(r.body).includes('password_hash'));

  // 2. Senha errada
  r = await req('POST', '/auth/admin/login', {
    email: 'admin@smokebebidas.com.br',
    password: 'senha_errada',
  });
  check('Admin senha errada (401)', r.status === 401, `status=${r.status}`);

  // 3. Usuário inexistente
  r = await req('POST', '/auth/admin/login', {
    email: 'inexistente@test.com',
    password: 'qualquer',
  });
  check('Admin usuário inexistente (401)', r.status === 401, `status=${r.status}`);

  // 4. GET /me com token válido
  r = await req('GET', '/auth/me', null, adminToken);
  check('GET /auth/me com token válido (200)', r.status === 200, `status=${r.status}`);
  check('GET /auth/me retorna type=admin', r.body?.type === 'admin', JSON.stringify(r.body));
  check('GET /auth/me não devolve password_hash', !JSON.stringify(r.body).includes('password_hash'));

  // 5. GET /me com token inválido
  r = await req('GET', '/auth/me', null, 'token_invalido_123');
  check('GET /auth/me com token inválido (401)', r.status === 401, `status=${r.status}`);

  // 6. Logout
  r = await req('POST', '/auth/logout', {});
  check('POST /auth/logout (200)', r.status === 200, `status=${r.status}`);

  // ============================================================
  // AUTH CLIENTE
  // ============================================================
  console.log('\n=== AUTH CLIENTE ===');

  // 1. Cliente novo — telefone único por execução (timestamp)
  const uniquePhone = `51988${Date.now().toString().slice(-6)}`;
  r = await req('POST', '/auth/customer', {
    phone: uniquePhone,
    name: 'João Teste',
  });
  const customerToken = r.body?.token;
  check('Cliente novo (is_new=true + token)', r.body?.is_new === true && !!customerToken, JSON.stringify(r.body).slice(0, 200));
  check('Cliente novo retorna customer', !!r.body?.customer?.id);

  // 2. Cliente existente (mesmo telefone)
  r = await req('POST', '/auth/customer', {
    phone: uniquePhone,
  });
  check('Cliente existente (is_new=false + token)', r.body?.is_new === false && !!r.body?.token, JSON.stringify(r.body).slice(0, 200));
  check('Cliente existente retorna addresses array', Array.isArray(r.body?.addresses));

  // 3. Cliente novo sem nome
  r = await req('POST', '/auth/customer', {
    phone: `51977${Date.now().toString().slice(-6)}`,
  });
  check('Cliente novo sem nome (exists=false)', r.body?.exists === false, JSON.stringify(r.body));

  // 4. Normalização de telefone (com 55 no início — deve encontrar o cliente criado acima)
  r = await req('POST', '/auth/customer', {
    phone: `55${uniquePhone}`,
  });
  check('Normalização telefone (5551... → encontra cliente)', r.body?.is_new === false, JSON.stringify(r.body).slice(0, 200));

  // ============================================================
  // AUTH MOTOBOY
  // ============================================================
  console.log('\n=== AUTH MOTOBOY ===');

  // 1. Login válido
  r = await req('POST', '/auth/motoboy', {
    login: 'motoboy_test',
    password: 'motoboy123',
  });
  const motoboyToken = r.body?.token;
  check('Motoboy login válido (200 + token)', r.status === 200 && !!motoboyToken, `status=${r.status}`);
  check('Motoboy login não devolve password_hash', !JSON.stringify(r.body).includes('password_hash'));

  // 2. Senha errada
  r = await req('POST', '/auth/motoboy', {
    login: 'motoboy_test',
    password: 'senha_errada',
  });
  check('Motoboy senha errada (401)', r.status === 401, `status=${r.status}`);

  // 3. Motoboy inativo
  r = await req('POST', '/auth/motoboy', {
    login: 'motoboy_inactive',
    password: 'motoboy123',
  });
  check('Motoboy inativo (403)', r.status === 403, `status=${r.status}`);

  // ============================================================
  // PRODUTOS
  // ============================================================
  console.log('\n=== PRODUTOS ===');

  // 1. Criar produto
  r = await req('POST', '/products', {
    name: 'Cerveja Heineken Long Neck',
    description: 'Cerveja Heineken 330ml gelada',
    category: 'cervejas',
    price: 8.50,
    cost_price: 5.20,
    stock: 120,
    min_stock: 24,
    image_url: 'https://example.com/heineken.jpg',
    is_featured: true,
    is_new: false,
    total_sold: 350,
    active: true,
  }, adminToken);
  const productId = r.body?.id;
  check('Criar produto (201 + id)', r.status === 201 && !!productId, `status=${r.status}`);
  check('Produto preserva todos os campos', 
    r.body?.name === 'Cerveja Heineken Long Neck' &&
    r.body?.category === 'cervejas' &&
    Number(r.body?.price) === 8.50 &&
    Number(r.body?.cost_price) === 5.20 &&
    Number(r.body?.stock) === 120 &&
    Number(r.body?.min_stock) === 24 &&
    r.body?.is_featured === true &&
    r.body?.is_new === false &&
    Number(r.body?.total_sold) === 350,
    JSON.stringify(r.body).slice(0, 300)
  );

  // 2. Criar produto sem token (deve falhar)
  r = await req('POST', '/products', {
    name: 'Produto Sem Auth',
    category: 'cervejas',
    price: 10,
  });
  check('Criar produto sem token (401)', r.status === 401, `status=${r.status}`);

  // 3. Criar segundo produto para filtros
  r = await req('POST', '/products', {
    name: 'Coca-Cola 2L',
    description: 'Refrigerante Coca-Cola 2 litros',
    category: 'refrigerantes',
    price: 12.00,
    stock: 80,
    is_featured: true,
    is_new: true,
    active: true,
  }, adminToken);
  const product2Id = r.body?.id;

  // 4. Listar produtos (público)
  r = await req('GET', '/products');
  check('Listar produtos (200 + array)', r.status === 200 && Array.isArray(r.body), `status=${r.status}`);
  check('Lista inclui produto criado', r.body?.some(p => p.id === productId), `count=${r.body?.length}`);

  // 5. Buscar por id
  r = await req('GET', `/products/${productId}`);
  check('Buscar produto por id (200)', r.status === 200 && r.body?.id === productId, `status=${r.status}`);

  // 6. Editar produto
  r = await req('PUT', `/products/${productId}`, {
    name: 'Cerveja Heineken Long Neck 350ml',
    price: 9.00,
    stock: 100,
  }, adminToken);
  check('Editar produto (200 + campos atualizados)', 
    r.status === 200 && 
    r.body?.name === 'Cerveja Heineken Long Neck 350ml' &&
    Number(r.body?.price) === 9.00 &&
    Number(r.body?.stock) === 100,
    JSON.stringify(r.body).slice(0, 200)
  );

  // 7. Desativar produto
  r = await req('PUT', `/products/${productId}`, { active: false }, adminToken);
  check('Desativar produto (active=false)', r.status === 200 && r.body?.active === false, JSON.stringify(r.body).slice(0, 100));

  // 8. Listar produtos (produto desativado NÃO deve aparecer)
  r = await req('GET', '/products');
  check('Produto desativado não aparece na lista pública', !r.body?.some(p => p.id === productId), `count=${r.body?.length}`);

  // 9. Listar com include_inactive=true (admin)
  r = await req('GET', '/products?include_inactive=true', null, adminToken);
  check('Admin vê produto inativo com include_inactive=true', r.body?.some(p => p.id === productId), `count=${r.body?.length}`);

  // 10. Buscar produto desativado sem ser admin (404)
  r = await req('GET', `/products/${productId}`);
  check('Produto desativado retorna 404 para público', r.status === 404, `status=${r.status}`);

  // 11. Buscar produto desativado como admin (200)
  r = await req('GET', `/products/${productId}`, null, adminToken);
  check('Admin vê produto desativado por id', r.status === 200 && r.body?.active === false, `status=${r.status}`);

  // 12. Filtro por categoria
  r = await req('GET', '/products?category=refrigerantes');
  check('Filtro por categoria', r.body?.every(p => p.category === 'refrigerantes') && r.body?.length > 0, `count=${r.body?.length}`);

  // 13. Filtro destacados
  r = await req('GET', '/products?featured=true');
  check('Filtro destacados (is_featured=true)', r.body?.every(p => p.is_featured === true), `count=${r.body?.length}`);

  // 14. Filtro lançamentos
  r = await req('GET', '/products?new=true');
  check('Filtro lançamentos (is_new=true)', r.body?.every(p => p.is_new === true), `count=${r.body?.length}`);

  // 15. Reativar produto para exclusão
  await req('PUT', `/products/${productId}`, { active: true }, adminToken);

  // 16. Excluir produto
  r = await req('DELETE', `/products/${productId}`, null, adminToken);
  check('Excluir produto (200)', r.status === 200 && r.body?.success === true, `status=${r.status}`);

  // 17. Buscar produto excluído (404)
  r = await req('GET', `/products/${productId}`);
  check('Produto excluído retorna 404', r.status === 404, `status=${r.status}`);

  // 18. Excluir produto inexistente (404)
  r = await req('DELETE', `/products/${productId}`, null, adminToken);
  check('Excluir produto inexistente (404)', r.status === 404, `status=${r.status}`);

  // Limpar produto 2
  await req('DELETE', `/products/${product2Id}`, null, adminToken);

  // ============================================================
  // UPLOAD
  // ============================================================
  console.log('\n=== UPLOAD ===');

  // 1. Upload válido (imagem PNG fake)
  // PNG header: 89 50 4E 47 0D 0A 1A 0A
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const pngBody = Buffer.concat([pngHeader, Buffer.alloc(100, 0)]);
  const formData = new FormData();
  formData.append('file', new Blob([pngBody], { type: 'image/png' }), 'test.png');

  try {
    const uploadRes = await fetch(`${BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    const uploadJson = await uploadRes.json();
    check('Upload válido (200 + file_url)', uploadRes.status === 200 && !!uploadJson.file_url, JSON.stringify(uploadJson).slice(0, 200));

    // 2. Servir arquivo via /uploads
    if (uploadJson.file_url) {
      const filename = uploadJson.filename;
      const serveRes = await fetch(`http://localhost:4000/uploads/${filename}`);
      check('Servir arquivo via /uploads (200)', serveRes.status === 200, `status=${serveRes.status}`);
    }
  } catch (e) {
    check('Upload válido', false, e.message);
  }

  // 3. Arquivo inválido (texto)
  const formData2 = new FormData();
  formData2.append('file', new Blob([Buffer.from('texto invalido')], { type: 'text/plain' }), 'test.txt');

  try {
    const uploadRes2 = await fetch(`${BASE}/upload`, {
      method: 'POST',
      body: formData2,
    });
    check('Upload arquivo inválido (400)', uploadRes2.status === 400, `status=${uploadRes2.status}`);
  } catch (e) {
    check('Upload arquivo inválido', false, e.message);
  }

  // ============================================================
  // RELATÓRIO
  // ============================================================
  console.log('\n=== RELATÓRIO ===');
  console.log(`PASS: ${passCount} | FAIL: ${failCount}`);
  
  // Lista falhas
  const failures = results.filter(r => r.status === 'FAIL');
  if (failures.length > 0) {
    console.log('\nFALHAS:');
    failures.forEach(f => console.log(`  ❌ ${f.name} — ${f.detail || ''}`));
  }

  return { passCount, failCount, results };
}

main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e));