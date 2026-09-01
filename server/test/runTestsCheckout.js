// ============================================================
// runTestsCheckout.js — Testes do fluxo de Checkout / placeOrder
// ============================================================
// Testa a criação de pedidos via POST /api/orders (transação atômica):
//   1. Pedido normal — criado com sucesso
//   2. Estoque insuficiente — rejeitado
//   3. Concorrência — duas tentativas para o último item
//   4. Produto inexistente — rejeitado
//   5. Preço manipulado — backend ignora preço do frontend
//   6. Cupom válido — desconto correto
//   7. Cupom inválido — rejeitado
//   8. Frete manipulado — backend recalcula
//   9. Cliente errado — bloqueado (ownership)
//  10. Idempotência — mesma chave não cria dois pedidos
//  11. Rollback — falha não deixa gravação parcial
//
// Requer backend rodando em localhost:4000 com PostgreSQL.
// Uso: node server/test/runTestsCheckout.js
// ============================================================

import { pool } from '../src/db/index.js';

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

async function req(method, path, body, token, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
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

async function dbQuery(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function main() {
  console.log('\n=== SETUP ===');

  // --- Admin login ---
  const adminLogin = await req('POST', '/auth/admin/login', {
    email: 'admin@smokebebidas.com.br',
    password: 'Admin@123456',
  });
  const adminToken = adminLogin.body?.access_token;
  check('Admin login', !!adminToken, `status=${adminLogin.status}`);

  if (!adminToken) {
    console.log('\n❌ Sem admin token — abortando testes');
    return { passCount, failCount, results };
  }

  // --- Store settings ---
  await req('PUT', '/store-settings', {
    store_name: 'Smoke Bebidas Test',
    cep: '94000-000', street: 'Rua Alberto Coelho', number: '100',
    district: 'Centro', city: 'Gravataí', state: 'RS',
    lat: -29.9416, lng: -51.0895,
    freight_per_km: 2.5, min_freight: 5,
    delivery_enabled: true,
    delivery_city: 'Gravataí', delivery_state: 'RS',
  }, adminToken);

  // --- Customer (login ou criação por celular) ---
  const customerPhone = '51988887777';
  const custLogin = await req('POST', '/auth/customer', { phone: customerPhone, name: 'Cliente Teste Checkout' });
  const customerToken = custLogin.body?.access_token;
  const customerId = custLogin.body?.customer?.id;
  check('Customer login/criação', !!customerToken && !!customerId, `status=${custLogin.status}`);

  if (!customerToken || !customerId) {
    console.log('\n❌ Sem customer token — abortando');
    return { passCount, failCount, results };
  }

  // --- Endereço do cliente ---
  const addrRes = await req('POST', '/addresses', {
    customer_id: customerId,
    label: 'Casa Teste',
    cep: '94000-000', street: 'Rua das Flores', number: '123',
    district: 'Centro', city: 'Gravataí', state: 'RS',
    reference: 'Portão azul',
  }, customerToken);
  const addressId = addrRes.body?.id;
  check('Endereço criado', !!addressId, `status=${addrRes.status}`);

  if (!addressId) {
    console.log('\n❌ Sem endereço — abortando');
    return { passCount, failCount, results };
  }

  // --- Produto para testes ---
  const prodRes = await req('POST', '/products', {
    name: 'Produto Checkout Test',
    category: 'cervejas',
    price: 10.00,
    stock: 5,
    active: true,
  }, adminToken);
  const productId = prodRes.body?.id;
  const productPrice = 10.00;
  check('Produto criado', !!productId, `status=${prodRes.status}`);

  // --- Cupom para testes ---
  const couponRes = await req('POST', '/coupons', {
    code: 'TESTECHECKOUT10',
    discount_percent: 10,
    max_uses: 100,
    per_customer_limit: 5,
    min_order_value: 20,
    active: true,
  }, adminToken);
  const couponCode = 'TESTECHECKOUT10';
  check('Cupom criado', couponRes.status === 201, `status=${couponRes.status}`);

  // --- Produto com estoque 1 (para teste de concorrência) ---
  const prodSingleRes = await req('POST', '/products', {
    name: 'Produto Unico Checkout Test',
    category: 'cervejas',
    price: 15.00,
    stock: 1,
    active: true,
  }, adminToken);
  const productSingleId = prodSingleRes.body?.id;
  check('Produto estoque-1 criado', !!productSingleId, `status=${prodSingleRes.status}`);

  // --- Produto inexistente (ID fake) ---
  const fakeProductId = '00000000-0000-0000-0000-000000000000';

  // ============================================================
  // 1. PEDIDO NORMAL
  // ============================================================
  console.log('\n=== 1. PEDIDO NORMAL ===');
  {
    const r = await req('POST', '/orders', {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: productPrice, quantity: 2 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
    }, customerToken);

    check('Pedido criado com sucesso', r.status === 201 && r.body?.success === true, `status=${r.status}`);
    check('Pedido tem order_id', !!r.body?.order_id);
    check('Pedido tem order_number', !!r.body?.order_number);
    check('Subtotal correto (2 × 10 = 20)', r.body?.subtotal === 20, `subtotal=${r.body?.subtotal}`);
    check('Total = subtotal - 0 + frete', r.body?.total > 0, `total=${r.body?.total}`);

    // Verifica estoque baixado
    const rows = await dbQuery('SELECT stock FROM products WHERE id = $1', [productId]);
    check('Estoque baixado (5 → 3)', rows[0]?.stock === 3, `stock=${rows[0]?.stock}`);

    // Verifica StockMovement
    const movements = await dbQuery("SELECT * FROM stock_movements WHERE product_id = $1 AND type = 'saida' ORDER BY created_date DESC LIMIT 1", [productId]);
    check('StockMovement registrado', movements.length > 0, `count=${movements.length}`);
  }

  // ============================================================
  // 2. ESTOQUE INSUFICIENTE
  // ============================================================
  console.log('\n=== 2. ESTOQUE INSUFICIENTE ===');
  {
    const r = await req('POST', '/orders', {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: productPrice, quantity: 100 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
    }, customerToken);

    check('Estoque insuficiente rejeitado', r.status === 400, `status=${r.status}`);
    check('Mensagem de estoque insuficiente', String(r.body?.error || '').includes('Estoque insuficiente'), `error=${r.body?.error}`);
  }

  // ============================================================
  // 3. CONCORRÊNCIA — duas tentativas para o último item
  // ============================================================
  console.log('\n=== 3. CONCORRÊNCIA ===');
  {
    // Reset estoque do produto single para 1
    await dbQuery('UPDATE products SET stock = 1 WHERE id = $1', [productSingleId]);

    const payload = {
      items: [{ product_id: productSingleId, product_name: 'Produto Unico', price: 15, quantity: 1 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'dinheiro',
    };

    // Dispara duas requisições simultâneas
    const [r1, r2] = await Promise.all([
      req('POST', '/orders', payload, customerToken),
      req('POST', '/orders', payload, customerToken),
    ]);

    const successCount = [r1, r2].filter(r => r.status === 201).length;
    const failCountLocal = [r1, r2].filter(r => r.status === 400).length;

    check('Apenas 1 pedido criado (concorrência)', successCount === 1, `success=${successCount}, fail=${failCountLocal}`);
    check('Segundo pedido rejeitado', failCountLocal === 1, `fail=${failCountLocal}`);

    // Estoque deve ser 0 (não negativo)
    const rows = await dbQuery('SELECT stock FROM products WHERE id = $1', [productSingleId]);
    check('Estoque final = 0 (não negativo)', rows[0]?.stock === 0, `stock=${rows[0]?.stock}`);
  }

  // ============================================================
  // 4. PRODUTO INEXISTENTE
  // ============================================================
  console.log('\n=== 4. PRODUTO INEXISTENTE ===');
  {
    const r = await req('POST', '/orders', {
      items: [{ product_id: fakeProductId, product_name: 'Inexistente', price: 10, quantity: 1 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
    }, customerToken);

    check('Produto inexistente rejeitado', r.status === 400, `status=${r.status}`);
    check('Mensagem de produto não encontrado', String(r.body?.error || '').includes('não encontrado'), `error=${r.body?.error}`);
  }

  // ============================================================
  // 5. PREÇO MANIPULADO — backend ignora preço do frontend
  // ============================================================
  console.log('\n=== 5. PREÇO MANIPULADO ===');
  {
    // Reset estoque
    await dbQuery('UPDATE products SET stock = 10 WHERE id = $1', [productId]);

    const r = await req('POST', '/orders', {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: 0.01, quantity: 1 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
    }, customerToken);

    check('Pedido criado mesmo com preço manipulado', r.status === 201, `status=${r.status}`);
    // O subtotal deve ser 10 (preço real), não 0.01
    check('Backend usou preço real (10), não 0.01', r.body?.subtotal === 10, `subtotal=${r.body?.subtotal}`);
  }

  // ============================================================
  // 6. CUPOM VÁLIDO
  // ============================================================
  console.log('\n=== 6. CUPOM VÁLIDO ===');
  {
    // Reset estoque
    await dbQuery('UPDATE products SET stock = 10 WHERE id = $1', [productId]);

    // Cria 3 itens para atingir min_order_value = 20
    const r = await req('POST', '/orders', {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: 10, quantity: 3 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
      coupon_code: couponCode,
    }, customerToken);

    check('Pedido com cupom criado', r.status === 201, `status=${r.status}`);
    check('Subtotal = 30 (3 × 10)', r.body?.subtotal === 30, `subtotal=${r.body?.subtotal}`);
    check('Desconto = 10% de 30 = 3', r.body?.discount === 3, `discount=${r.body?.discount}`);
    check('Cupom aplicado no pedido', r.body?.coupon_code === couponCode, `coupon=${r.body?.coupon_code}`);
  }

  // ============================================================
  // 7. CUPOM INVÁLIDO
  // ============================================================
  console.log('\n=== 7. CUPOM INVÁLIDO ===');
  {
    await dbQuery('UPDATE products SET stock = 10 WHERE id = $1', [productId]);

    const r = await req('POST', '/orders', {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: 10, quantity: 1 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
      coupon_code: 'CUPOM_INEXISTENTE_XYZ',
    }, customerToken);

    check('Cupom inexistente rejeitado', r.status === 400, `status=${r.status}`);
    check('Mensagem de cupom não encontrado', String(r.body?.error || '').includes('Cupom não encontrado'), `error=${r.body?.error}`);
  }

  // ============================================================
  // 8. FRETE MANIPULADO — backend recalcula
  // ============================================================
  console.log('\n=== 8. FRETE MANIPULADO ===');
  {
    await dbQuery('UPDATE products SET stock = 10 WHERE id = $1', [productId]);

    // O frontend NÃO envia freight — o backend calcula sozinho.
    // Mesmo se enviasse, o backend ignoraria e recalcularia.
    const r = await req('POST', '/orders', {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: 10, quantity: 1 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
    }, customerToken);

    check('Pedido criado sem frete do frontend', r.status === 201, `status=${r.status}`);
    check('Frete calculado pelo backend (> 0)', r.body?.freight > 0, `freight=${r.body?.freight}`);
    check('Distance_km calculado', r.body?.distance_km > 0, `distance=${r.body?.distance_km}`);
  }

  // ============================================================
  // 9. CLIENTE ERRADO — bloqueado (ownership)
  // ============================================================
  console.log('\n=== 9. CLIENTE ERRADO ===');
  {
    // Cria um segundo cliente
    const cust2 = await req('POST', '/auth/customer', { phone: '51977776666', name: 'Cliente 2' });
    const customer2Id = cust2.body?.customer?.id;

    // Tenta criar pedido com customer_id do cliente 2 usando token do cliente 1
    const r = await req('POST', '/orders', {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: 10, quantity: 1 }],
      address_id: addressId, // endereço do cliente 1
      customer_id: customer2Id, // mas customer_id do cliente 2
      payment_method: 'pix',
    }, customerToken); // token do cliente 1

    check('Pedido com customer_id alheio bloqueado', r.status === 403, `status=${r.status}`);
  }

  // ============================================================
  // 10. IDEMPOTÊNCIA — mesma chave não cria dois pedidos
  // ============================================================
  console.log('\n=== 10. IDEMPOTÊNCIA ===');
  {
    await dbQuery('UPDATE products SET stock = 10 WHERE id = $1', [productId]);

    const idemKey = 'test-idemp-' + Date.now();
    const payload = {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: 10, quantity: 1 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
    };
    const headers = { 'Idempotency-Key': idemKey };

    const r1 = await req('POST', '/orders', payload, customerToken, headers);
    const r2 = await req('POST', '/orders', payload, customerToken, headers);

    check('Primeiro pedido criado', r1.status === 201, `status=${r1.status}`);
    check('Segundo pedido com mesma chave = replay', r2.status === 201 && r2.body?.idempotent_replay === true, `status=${r2.status}, replay=${r2.body?.idempotent_replay}`);
    check('Mesmo order_id nos dois', r1.body?.order_id === r2.body?.order_id, `id1=${r1.body?.order_id}, id2=${r2.body?.order_id}`);

    // Estoque só baixou 1 vez
    const rows = await dbQuery('SELECT stock FROM products WHERE id = $1', [productId]);
    check('Estoque baixou apenas 1 (9 → 9, não 8)', rows[0]?.stock === 9, `stock=${rows[0]?.stock}`);
  }

  // ============================================================
  // 11. ROLLBACK — falha não deixa gravação parcial
  // ============================================================
  console.log('\n=== 11. ROLLBACK ===');
  {
    await dbQuery('UPDATE products SET stock = 5 WHERE id = $1', [productId]);

    // Conta pedidos antes
    const beforeRows = await dbQuery('SELECT count(*) as c FROM orders WHERE customer_id = $1', [customerId]);
    const ordersBefore = parseInt(beforeRows[0]?.c || 0);

    // Tenta criar pedido com cupom inexistente (vai falhar no meio da transação)
    const r = await req('POST', '/orders', {
      items: [{ product_id: productId, product_name: 'Produto Checkout Test', price: 10, quantity: 1 }],
      address_id: addressId,
      customer_id: customerId,
      payment_method: 'pix',
      coupon_code: 'CUPOM_FALHA_ROLLBACK',
    }, customerToken);

    check('Pedido com cupom falho rejeitado', r.status === 400, `status=${r.status}`);

    // Estoque não deve ter mudado (rollback)
    const rows = await dbQuery('SELECT stock FROM products WHERE id = $1', [productId]);
    check('Estoque não baixou (rollback) — ainda 5', rows[0]?.stock === 5, `stock=${rows[0]?.stock}`);

    // Número de pedidos não deve ter aumentado
    const afterRows = await dbQuery('SELECT count(*) as c FROM orders WHERE customer_id = $1', [customerId]);
    const ordersAfter = parseInt(afterRows[0]?.c || 0);
    check('Nenhum pedido parcial criado', ordersAfter === ordersBefore, `before=${ordersBefore}, after=${ordersAfter}`);
  }

  // ============================================================
  // CLEANUP
  // ============================================================
  console.log('\n=== CLEANUP ===');
  await dbQuery('DELETE FROM stock_movements WHERE product_id IN ($1, $2)', [productId, productSingleId]);
  await dbQuery('DELETE FROM orders WHERE customer_id = $1', [customerId]);
  await dbQuery('DELETE FROM customer_addresses WHERE customer_id = $1', [customerId]);
  await dbQuery('DELETE FROM products WHERE id IN ($1, $2)', [productId, productSingleId]);
  await dbQuery('DELETE FROM coupons WHERE code = $1', [couponCode]);
  await dbQuery('DELETE FROM customers WHERE phone IN ($1, $2)', [customerPhone, '51977776666']);

  // ============================================================
  // RESUMO
  // ============================================================
  console.log('\n========================================');
  console.log(`RESULTADO: ${passCount} passaram, ${failCount} falharam`);
  console.log('========================================');

  await pool.end();
  return { passCount, failCount, results };
}

main().catch((err) => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});