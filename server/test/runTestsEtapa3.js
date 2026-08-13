// ============================================================
// runTestsEtapa3.js — Testes da Etapa 3
// ============================================================
// Testa: Clientes, Endereços, Store Settings, Frete, Cupons
// Requer backend rodando em localhost:4000 com PostgreSQL.
// ============================================================

const BASE = 'http://localhost:4000/api';

let passCount = 0;
let failCount = 0;
const results = [];

function check(name, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (condition) passCount++;
  else failCount++;
  results.push({ name, status, detail: detail ? String(detail).slice(0, 200) : undefined });
  console.log(`[${status}] ${name}${detail ? ' — ' + String(detail).slice(0, 100) : ''}`);
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
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  } catch (e) {
    return { status: 0, body: null, error: e.message };
  }
}

async function main() {
  console.log('\n=== TESTES ETAPA 3 ===\n');

  // ============================================================
  // LOGIN ADMIN
  // ============================================================
  let r = await req('POST', '/auth/admin/login', {
    email: 'admin@smokebebidas.com.br',
    password: 'Admin@123456',
  });
  const adminToken = r.body?.token;
  check('Admin login', r.status === 200 && !!adminToken, `status=${r.status}`);

  // ============================================================
  // 1. CLIENTES (CRUD admin)
  // ============================================================
  console.log('\n--- CLIENTES ---\n');

  const uniquePhone = `51999${Date.now().toString().slice(-6)}`;

  // Criar
  r = await req('POST', '/customers', { name: 'Cliente Teste Etapa3', phone: uniquePhone, email: 'teste3@smoke.com' }, adminToken);
  check('Criar cliente (201)', r.status === 201, `status=${r.status}`);
  const customerId = r.body?.id;
  check('Criar preserva name/phone/email', r.body?.name === 'Cliente Teste Etapa3' && r.body?.phone === uniquePhone, JSON.stringify(r.body).slice(0, 150));

  // Telefone duplicado
  r = await req('POST', '/customers', { name: 'Outro', phone: uniquePhone }, adminToken);
  check('Telefone duplicado (409)', r.status === 409, `status=${r.status}`);

  // Listar
  r = await req('GET', '/customers', null, adminToken);
  check('Listar clientes (200 + array)', r.status === 200 && Array.isArray(r.body), `status=${r.status}`);

  // Buscar por ID
  r = await req('GET', `/customers/${customerId}`, null, adminToken);
  check('Buscar cliente por ID (200)', r.status === 200 && r.body?.id === customerId, `status=${r.status}`);

  // Atualizar
  r = await req('PUT', `/customers/${customerId}`, { name: 'Cliente Atualizado', email: 'novo@smoke.com' }, adminToken);
  check('Atualizar cliente (200 + campos)', r.status === 200 && r.body?.name === 'Cliente Atualizado', `status=${r.status}`);

  // Atualizar com telefone duplicado de outro cliente
  const phone2 = `51988${Date.now().toString().slice(-6)}`;
  r = await req('POST', '/customers', { name: 'Segundo Cliente', phone: phone2 }, adminToken);
  const customerId2 = r.body?.id;
  r = await req('PUT', `/customers/${customerId2}`, { phone: uniquePhone }, adminToken);
  check('Atualizar telefone duplicado (409)', r.status === 409, `status=${r.status}`);

  // Sem token admin
  r = await req('GET', '/customers');
  check('Listar sem token (401)', r.status === 401, `status=${r.status}`);

  // Excluir
  r = await req('DELETE', `/customers/${customerId2}`, null, adminToken);
  check('Excluir cliente (200)', r.status === 200, `status=${r.status}`);

  // ============================================================
  // 2. ENDEREÇOS (ownership)
  // ============================================================
  console.log('\n--- ENDEREÇOS ---\n');

  // Login de dois clientes diferentes
  r = await req('POST', '/auth/customer', { phone: uniquePhone });
  const customerTokenA = r.body?.token;
  r = await req('POST', '/auth/customer', { phone: `51977${Date.now().toString().slice(-6)}`, name: 'Cliente B Teste' });
  const customerTokenB = r.body?.token;
  const customerBId = r.body?.customer?.id;

  // Criar endereço para cliente A
  r = await req('POST', '/addresses', {
    customer_id: customerId,
    label: 'Casa',
    cep: '94000-000',
    street: 'Rua Doutor Luiz Bastos do Prado',
    number: '100',
    district: 'Centro',
    city: 'Gravataí',
    state: 'RS',
    reference: 'Próximo à praça',
  }, customerTokenA);
  check('Criar endereço (201)', r.status === 201, `status=${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
  const addressId = r.body?.id;
  check('Endereço preserva campos', r.body?.street === 'Rua Doutor Luiz Bastos do Prado' && r.body?.city === 'Gravataí', JSON.stringify(r.body).slice(0, 150));

  // Listar endereços do cliente A
  r = await req('GET', `/addresses/${customerId}`, null, customerTokenA);
  check('Listar endereços do próprio cliente (200 + array)', r.status === 200 && Array.isArray(r.body), `status=${r.status}`);

  // Cliente B tenta listar endereços do cliente A (IDOR)
  r = await req('GET', `/addresses/${customerId}`, null, customerTokenB);
  check('Cliente B não lista endereços do cliente A (403)', r.status === 403, `status=${r.status}`);

  // Cliente B tenta criar endereço para cliente A (IDOR)
  r = await req('POST', '/addresses', {
    customer_id: customerId,
    street: 'Rua Hack', number: '999', district: 'Centro', city: 'Gravataí', state: 'RS',
  }, customerTokenB);
  check('Cliente B não cria endereço para cliente A (403)', r.status === 403, `status=${r.status}`);

  // Admin lista endereços de qualquer cliente
  r = await req('GET', `/addresses/${customerId}`, null, adminToken);
  check('Admin lista endereços de qualquer cliente (200)', r.status === 200 && Array.isArray(r.body), `status=${r.status}`);

  // Editar endereço (próprio)
  r = await req('PUT', `/addresses/${addressId}`, { complement: 'Apto 202' }, customerTokenA);
  check('Editar próprio endereço (200)', r.status === 200 && r.body?.complement === 'Apto 202', `status=${r.status}`);

  // Cliente B tenta editar endereço do cliente A (IDOR)
  r = await req('PUT', `/addresses/${addressId}`, { complement: 'Hackeado' }, customerTokenB);
  check('Cliente B não edita endereço do cliente A (403)', r.status === 403, `status=${r.status}`);

  // Excluir endereço (próprio)
  r = await req('DELETE', `/addresses/${addressId}`, null, customerTokenA);
  check('Excluir próprio endereço (200)', r.status === 200, `status=${r.status}`);

  // Endereço excluído retorna 404
  r = await req('PUT', `/addresses/${addressId}`, { complement: 'X' }, customerTokenA);
  check('Editar endereço excluído (404)', r.status === 404, `status=${r.status}`);

  // Sem token
  r = await req('GET', `/addresses/${customerId}`);
  check('Listar endereços sem token (401)', r.status === 401, `status=${r.status}`);

  // ============================================================
  // 3. STORE SETTINGS (singleton)
  // ============================================================
  console.log('\n--- STORE SETTINGS ---\n');

  // GET público
  r = await req('GET', '/store-settings');
  check('GET store-settings público (200)', r.status === 200, `status=${r.status}`);
  check('Singleton tem store_name', !!r.body?.store_name, JSON.stringify(r.body).slice(0, 100));
  const settingsId = r.body?.id;

  // PUT admin — configura endereço da loja em Gravataí
  r = await req('PUT', '/store-settings', {
    store_name: 'Smoke Bebidas',
    cep: '94000-000',
    street: 'Rua Doutor Luiz Bastos do Prado',
    number: '50',
    district: 'Centro',
    city: 'Gravataí',
    state: 'RS',
    lat: -29.9488,
    lng: -50.9930,
    delivery_enabled: true,
    delivery_city: 'Gravataí',
    delivery_state: 'RS',
    freight_per_km: 2.5,
    min_freight: 0,
    free_freight_threshold: 0,
    max_delivery_radius_km: 0,
    estimated_delivery_minutes: 30,
    freight_table: [],
  }, adminToken);
  check('PUT store-settings admin (200)', r.status === 200, `status=${r.status}`);
  check('Settings atualizou lat/lng', r.body?.lat === -29.9488 && r.body?.lng === -50.9930, JSON.stringify(r.body).slice(0, 150));

  // Singleton preservado — mesmo id após update
  r = await req('GET', '/store-settings');
  check('Singleton preservado (mesmo id)', r.body?.id === settingsId, `id=${r.body?.id} vs ${settingsId}`);

  // PUT sem admin (cliente)
  r = await req('PUT', '/store-settings', { store_name: 'Hack' }, customerTokenA);
  check('PUT store-settings sem admin (403)', r.status === 403, `status=${r.status}`);

  // PUT sem token
  r = await req('PUT', '/store-settings', { store_name: 'Hack2' });
  check('PUT store-settings sem token (401)', r.status === 401, `status=${r.status}`);

  // ============================================================
  // 4. FRETE
  // ============================================================
  console.log('\n--- FRETE ---\n');

  // Endereço válido em Gravataí
  r = await req('POST', '/freight/calculate', {
    address: {
      cep: '94000-000',
      street: 'Rua Doutor Luiz Bastos do Prado',
      number: '200',
      district: 'Centro',
      city: 'Gravataí',
      state: 'RS',
    },
  });
  check('Frete endereço válido (200)', r.status === 200, `status=${r.status} ${JSON.stringify(r.body).slice(0, 150)}`);
  check('Frete retorna distance_km', r.body?.distance_km != null, JSON.stringify(r.body).slice(0, 100));
  check('Frete retorna freight', r.body?.freight != null, `freight=${r.body?.freight}`);
  check('Frete retorna freight_mode', !!r.body?.freight_mode, `mode=${r.body?.freight_mode}`);
  check('Frete retorna route_geometry', Array.isArray(r.body?.route_geometry), `geometry length=${r.body?.route_geometry?.length}`);

  // Cidade inválida (Porto Alegre — Nominatim encontra, mas city ≠ Gravataí)
  r = await req('POST', '/freight/calculate', {
    address: {
      street: 'Rua dos Andradas', number: '100', district: 'Centro', city: 'Porto Alegre', state: 'RS', cep: '90020-000',
    },
  });
  check('Frete cidade inválida (403)', r.status === 403, `status=${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);

  // Delivery desativado
  await req('PUT', '/store-settings', { delivery_enabled: false }, adminToken);
  r = await req('POST', '/freight/calculate', {
    address: { street: 'Rua Doutor Luiz Bastos do Prado', number: '200', district: 'Centro', city: 'Gravataí', state: 'RS' },
  });
  check('Frete delivery desativado (503)', r.status === 503, `status=${r.status}`);
  await req('PUT', '/store-settings', { delivery_enabled: true }, adminToken);

  // Tabela de frete
  await req('PUT', '/store-settings', {
    freight_table: [
      { distance_km: 2, price: 5.0 },
      { distance_km: 5, price: 8.0 },
      { distance_km: 10, price: 12.0 },
    ],
  }, adminToken);
  r = await req('POST', '/freight/calculate', {
    address: { street: 'Rua Doutor Luiz Bastos do Prado', number: '200', district: 'Centro', city: 'Gravataí', state: 'RS' },
  });
  check('Frete tabela (freight_mode=table)', r.body?.freight_mode === 'table', `mode=${r.body?.freight_mode} freight=${r.body?.freight}`);
  check('Frete tabela retorna freight_range_km', r.body?.freight_range_km != null, `range=${r.body?.freight_range_km}`);

  // Raio máximo (tabela) — endereço novo além da faixa máxima (Rua João Pessoa ~4km)
  await req('PUT', '/store-settings', {
    freight_table: [{ distance_km: 1, price: 3.0 }],
  }, adminToken);
  r = await req('POST', '/freight/calculate', {
    address: { street: 'Rua João Pessoa', number: '100', district: 'Granville', city: 'Gravataí', state: 'RS' },
  });
  check('Frete além da faixa máxima (403)', r.status === 403, `status=${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);

  // Frete por KM (sem tabela)
  await req('PUT', '/store-settings', {
    freight_table: [],
    freight_per_km: 5.0,
    min_freight: 0,
    max_delivery_radius_km: 0,
  }, adminToken);
  r = await req('POST', '/freight/calculate', {
    address: { street: 'Rua Doutor Luiz Bastos do Prado', number: '200', district: 'Centro', city: 'Gravataí', state: 'RS' },
  });
  check('Frete por KM (freight_mode=per_km)', r.body?.freight_mode === 'per_km', `mode=${r.body?.freight_mode} freight=${r.body?.freight}`);

  // Frete mínimo
  await req('PUT', '/store-settings', { min_freight: 50.0 }, adminToken);
  r = await req('POST', '/freight/calculate', {
    address: { street: 'Rua Doutor Luiz Bastos do Prado', number: '200', district: 'Centro', city: 'Gravataí', state: 'RS' },
  });
  check('Frete mínimo aplicado', r.body?.freight === 50, `freight=${r.body?.freight}`);
  await req('PUT', '/store-settings', { min_freight: 0 }, adminToken);

  // Raio máximo (modo por KM) — endereço novo além do raio (Rua João Pessoa ~4km)
  await req('PUT', '/store-settings', { max_delivery_radius_km: 1 }, adminToken);
  r = await req('POST', '/freight/calculate', {
    address: { street: 'Rua João Pessoa', number: '100', district: 'Granville', city: 'Gravataí', state: 'RS' },
  });
  check('Frete raio máximo excedido (403)', r.status === 403, `status=${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
  await req('PUT', '/store-settings', { max_delivery_radius_km: 0, freight_table: [], freight_per_km: 2.5 }, adminToken);

  // Falha de API externa tratada — endereço que Nominatim não encontra
  r = await req('POST', '/freight/calculate', {
    address: { street: 'Rua Inexistente XYZ', number: '99999', district: 'Bairro Imaginário', city: 'Gravataí', state: 'RS' },
  });
  check('Frete endereço não geocodificado (404, não 500)', r.status === 404, `status=${r.status}`);

  // ============================================================
  // 5. CUPONS
  // ============================================================
  console.log('\n--- CUPONS ---\n');

  // Criar cupom válido
  const couponCode = `PROMO${Date.now().toString().slice(-4)}`;
  r = await req('POST', '/coupons', { code: couponCode, discount_percent: 10, max_uses: 0, per_customer_limit: 1, min_order_value: 0, active: true }, adminToken);
  check('Criar cupom (201)', r.status === 201, `status=${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
  const couponId = r.body?.id;
  check('Cupom code maiúsculo', r.body?.code === couponCode, `code=${r.body?.code}`);

  // Cupom duplicado
  r = await req('POST', '/coupons', { code: couponCode, discount_percent: 5 }, adminToken);
  check('Cupom duplicado (409)', r.status === 409, `status=${r.status}`);

  // Listar
  r = await req('GET', '/coupons', null, adminToken);
  check('Listar cupons (200 + array)', r.status === 200 && Array.isArray(r.body), `status=${r.status}`);

  // Buscar por ID
  r = await req('GET', `/coupons/${couponId}`, null, adminToken);
  check('Buscar cupom por ID (200)', r.status === 200 && r.body?.id === couponId, `status=${r.status}`);

  // Atualizar
  r = await req('PUT', `/coupons/${couponId}`, { discount_percent: 15 }, adminToken);
  check('Atualizar cupom (200)', r.status === 200 && Number(r.body?.discount_percent) === 15, `status=${r.status}`);

  // CRUD sem admin
  r = await req('GET', '/coupons');
  check('Listar cupons sem token (401)', r.status === 401, `status=${r.status}`);

  // === VALIDAÇÃO ===

  // Cupom válido
  r = await req('POST', '/coupons/validate', { coupon_code: couponCode, subtotal: 100, customer_id: customerId });
  check('Cupom válido (valid=true)', r.body?.valid === true, JSON.stringify(r.body).slice(0, 150));
  check('Cálculo do desconto correto (15% de 100 = 15)', r.body?.discount === 15, `discount=${r.body?.discount}`);

  // Cupom case-insensitive
  r = await req('POST', '/coupons/validate', { coupon_code: couponCode.toLowerCase(), subtotal: 100 });
  check('Cupom case-insensitive (valid=true)', r.body?.valid === true, JSON.stringify(r.body).slice(0, 100));

  // Cupom inexistente
  r = await req('POST', '/coupons/validate', { coupon_code: 'INEXISTENTE999', subtotal: 100 });
  check('Cupom inexistente (404)', r.status === 404 && r.body?.valid === false, `status=${r.status}`);

  // Cupom inativo
  await req('PUT', `/coupons/${couponId}`, { active: false }, adminToken);
  r = await req('POST', '/coupons/validate', { coupon_code: couponCode, subtotal: 100 });
  check('Cupom inativo (403)', r.status === 403 && r.body?.valid === false, `status=${r.status}`);
  await req('PUT', `/coupons/${couponId}`, { active: true }, adminToken);

  // Cupom antes da data
  const futureCode = `FUT${Date.now().toString().slice(-4)}`;
  r = await req('POST', '/coupons', { code: futureCode, discount_percent: 10, start_date: '2099-12-31', active: true }, adminToken);
  const futureCouponId = r.body?.id;
  r = await req('POST', '/coupons/validate', { coupon_code: futureCode, subtotal: 100 });
  check('Cupom antes da data (403)', r.status === 403 && r.body?.valid === false, `status=${r.status} ${r.body?.message}`);

  // Cupom expirado
  const expiredCode = `EXP${Date.now().toString().slice(-4)}`;
  r = await req('POST', '/coupons', { code: expiredCode, discount_percent: 10, end_date: '2020-01-01', active: true }, adminToken);
  const expiredCouponId = r.body?.id;
  r = await req('POST', '/coupons/validate', { coupon_code: expiredCode, subtotal: 100 });
  check('Cupom expirado (403)', r.status === 403 && r.body?.valid === false, `status=${r.status} ${r.body?.message}`);

  // Pedido abaixo do mínimo
  const minCode = `MIN${Date.now().toString().slice(-4)}`;
  r = await req('POST', '/coupons', { code: minCode, discount_percent: 10, min_order_value: 200, active: true }, adminToken);
  const minCouponId = r.body?.id;
  r = await req('POST', '/coupons/validate', { coupon_code: minCode, subtotal: 100 });
  check('Pedido abaixo do mínimo (403)', r.status === 403 && r.body?.valid === false, `status=${r.status} ${r.body?.message}`);
  r = await req('POST', '/coupons/validate', { coupon_code: minCode, subtotal: 250 });
  check('Pedido acima do mínimo (valid=true)', r.body?.valid === true, `status=${r.status}`);

  // max_uses atingido
  const maxCode = `MAX${Date.now().toString().slice(-4)}`;
  r = await req('POST', '/coupons', { code: maxCode, discount_percent: 10, max_uses: 1, active: true }, adminToken);
  const maxCouponId = r.body?.id;
  // used_count=0 < max_uses=1 → válido
  r = await req('POST', '/coupons/validate', { coupon_code: maxCode, subtotal: 100 });
  check('Cupom max_uses=1 com used_count=0 (valid=true)', r.body?.valid === true, `status=${r.status}`);
  // Simula uso: admin seta used_count=1 → atingiu max_uses
  await req('PUT', `/coupons/${maxCouponId}`, { used_count: 1 }, adminToken);
  r = await req('POST', '/coupons/validate', { coupon_code: maxCode, subtotal: 100 });
  check('Cupom max_uses atingido (403 esgotado)', r.status === 403 && r.body?.valid === false, `status=${r.status} ${r.body?.message}`);

  // Limite por cliente
  const limitCode = `LIM${Date.now().toString().slice(-4)}`;
  r = await req('POST', '/coupons', { code: limitCode, discount_percent: 10, per_customer_limit: 1, active: true }, adminToken);
  const limitCouponId = r.body?.id;
  // used_by vazio → cliente ainda não usou → válido
  r = await req('POST', '/coupons/validate', { coupon_code: limitCode, subtotal: 100, customer_id: customerId });
  check('Cupom limite por cliente (ainda não usou → valid=true)', r.body?.valid === true, JSON.stringify(r.body).slice(0, 100));
  // Simula: admin seta used_by com o customer_id → limite atingido
  await req('PUT', `/coupons/${limitCouponId}`, { used_by: [customerId] }, adminToken);
  r = await req('POST', '/coupons/validate', { coupon_code: limitCode, subtotal: 100, customer_id: customerId });
  check('Cupom limite por cliente atingido (403)', r.status === 403 && r.body?.valid === false, `status=${r.status} ${r.body?.message}`);

  // validate NÃO altera used_count
  r = await req('GET', `/coupons/${couponId}`, null, adminToken);
  check('Validate NÃO incrementa used_count', Number(r.body?.used_count) === 0, `used_count=${r.body?.used_count}`);

  // Excluir cupons de teste
  await req('DELETE', `/coupons/${couponId}`, null, adminToken);
  await req('DELETE', `/coupons/${futureCouponId}`, null, adminToken);
  await req('DELETE', `/coupons/${expiredCouponId}`, null, adminToken);
  await req('DELETE', `/coupons/${minCouponId}`, null, adminToken);
  await req('DELETE', `/coupons/${maxCouponId}`, null, adminToken);
  await req('DELETE', `/coupons/${limitCouponId}`, null, adminToken);
  await req('DELETE', `/customers/${customerId}`, null, adminToken);
  if (customerBId) await req('DELETE', `/customers/${customerBId}`, null, adminToken);

  // ============================================================
  // RELATÓRIO
  // ============================================================
  console.log('\n=== RELATÓRIO ===');
  console.log(`PASS: ${passCount} | FAIL: ${failCount}`);
  console.log(JSON.stringify({ passCount, failCount, results }, null, 2));
}

main().catch((e) => {
  console.error('Erro fatal nos testes:', e);
  process.exit(1);
});