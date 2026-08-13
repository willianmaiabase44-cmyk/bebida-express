// ============================================================
// runTestsEtapa4.js — Suite de testes da Etapa 4
// ============================================================
// Testa o NÚCLEO TRANSACIONAL de PEDIDOS + ESTOQUE + CUPOM:
//   - Criação de pedido (transação atômica)
//   - Baixa de estoque com SELECT FOR UPDATE
//   - order_number via sequence
//   - Preços recalculados pelo backend
//   - Ownership de cliente/endereço
//   - Cupom consumido dentro da transação
//   - Concorrência (estoque, cupom, order_number)
//   - Rollback em caso de falha
//
// Usa PostgreSQL real + API real (localhost:4000).
// Acesso direto ao banco para verificação e cleanup.
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
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, body: json, raw: text };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

// Helper: query direta no banco para verificação
async function dbQuery(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

// ============================================================
// SETUP — dados de teste
// ============================================================
async function setup() {
  console.log('\n=== SETUP ===');

  // 1. Login admin
  const adminLogin = await req('POST', '/auth/admin/login', {
    email: 'admin@smokebebidas.com.br',
    password: 'Admin@123456',
  });
  const adminToken = adminLogin.body?.token;
  check('Admin login para setup', !!adminToken, `status=${adminLogin.status}`);

  // 2. Configurar store settings com lat/lng (Gravataí)
  await req('PUT', '/store-settings', {
    store_name: 'Smoke Bebidas',
    cep: '94000-000',
    street: 'Rua Alberto Coelho',
    number: '100',
    district: 'Centro',
    city: 'Gravataí',
    state: 'RS',
    lat: -29.9416,
    lng: -51.0895,
    freight_per_km: 2.5,
    min_freight: 0,
    free_freight_threshold: 0,
    max_delivery_radius_km: 0,
    delivery_enabled: true,
    delivery_city: 'Gravataí',
    delivery_state: 'RS',
    freight_table: [],
  }, adminToken);

  // 3. Criar cliente A
  const phoneA = `51988${Date.now().toString().slice(-6)}`;
  const custA = await req('POST', '/auth/customer', { phone: phoneA, name: 'Cliente A Etapa4' });
  const tokenA = custA.body?.token;
  const customerAId = custA.body?.customer?.id;

  // 4. Criar endereço para cliente A (com lat/lng — evita Nominatim)
  const addrA = await req('POST', '/addresses', {
    customer_id: customerAId,
    label: 'Casa',
    cep: '94000-000',
    street: 'Rua Alberto Coelho',
    number: '200',
    district: 'Centro',
    city: 'Gravataí',
    state: 'RS',
    lat: -29.942,
    lng: -51.090,
  }, tokenA);
  const addressAId = addrA.body?.id;

  // 5. Criar cliente B
  const phoneB = `51977${Date.now().toString().slice(-6)}`;
  const custB = await req('POST', '/auth/customer', { phone: phoneB, name: 'Cliente B Etapa4' });
  const tokenB = custB.body?.token;
  const customerBId = custB.body?.customer?.id;

  // 6. Criar endereço para cliente B
  const addrB = await req('POST', '/addresses', {
    customer_id: customerBId,
    label: 'Casa',
    cep: '94000-000',
    street: 'Rua Alberto Coelho',
    number: '300',
    district: 'Centro',
    city: 'Gravataí',
    state: 'RS',
    lat: -29.943,
    lng: -51.091,
  }, tokenB);
  const addressBId = addrB.body?.id;

  // 7. Criar produtos para teste
  // Produto 1: estoque 10, preço 8.50
  const prod1 = await req('POST', '/products', {
    name: 'Cerveja Teste Etapa4',
    category: 'cervejas',
    price: 8.50,
    cost_price: 5.00,
    stock: 10,
    min_stock: 5,
    active: true,
  }, adminToken);
  const product1Id = prod1.body?.id;

  // Produto 2: estoque 1 (para teste de concorrência)
  const prod2 = await req('POST', '/products', {
    name: 'Destilado Teste Etapa4',
    category: 'destilados',
    price: 45.00,
    cost_price: 30.00,
    stock: 1,
    min_stock: 1,
    active: true,
  }, adminToken);
  const product2Id = prod2.body?.id;

  // Produto 3: estoque 5
  const prod3 = await req('POST', '/products', {
    name: 'Refrigerante Teste Etapa4',
    category: 'refrigerantes',
    price: 12.00,
    cost_price: 7.00,
    stock: 5,
    min_stock: 2,
    active: true,
  }, adminToken);
  const product3Id = prod3.body?.id;

  // 8. Criar cupons para teste
  // Cupom normal: 10% desconto, sem limite
  const coupon1 = await req('POST', '/coupons', {
    code: `ETAPA4${Date.now().toString().slice(-4)}`,
    discount_percent: 10,
    max_uses: 0,
    per_customer_limit: 1,
    min_order_value: 0,
    active: true,
  }, adminToken);
  const coupon1Code = coupon1.body?.code;

  // Cupom com max_uses = 1 (para teste de concorrência)
  const coupon2 = await req('POST', '/coupons', {
    code: `UNICO${Date.now().toString().slice(-4)}`,
    discount_percent: 15,
    max_uses: 1,
    per_customer_limit: 0,
    min_order_value: 0,
    active: true,
  }, adminToken);
  const coupon2Code = coupon2.body?.code;
  const coupon2Id = coupon2.body?.id;

  // Cupom per_customer_limit = 1
  const coupon3 = await req('POST', '/coupons', {
    code: `LIMIT${Date.now().toString().slice(-4)}`,
    discount_percent: 5,
    max_uses: 0,
    per_customer_limit: 1,
    min_order_value: 0,
    active: true,
  }, adminToken);
  const coupon3Code = coupon3.body?.code;

  return {
    adminToken,
    tokenA, customerAId, addressAId,
    tokenB, customerBId, addressBId,
    product1Id, product2Id, product3Id,
    coupon1Code, coupon2Code, coupon2Id, coupon3Code,
  };
}

// ============================================================
// CLEANUP — remover dados de teste
// ============================================================
async function cleanup(ctx) {
  console.log('\n=== CLEANUP ===');

  // Deletar stock movements dos produtos de teste
  if (ctx.product1Id) await pool.query('DELETE FROM stock_movements WHERE product_id = $1', [ctx.product1Id]);
  if (ctx.product2Id) await pool.query('DELETE FROM stock_movements WHERE product_id = $1', [ctx.product2Id]);
  if (ctx.product3Id) await pool.query('DELETE FROM stock_movements WHERE product_id = $1', [ctx.product3Id]);

  // Deletar pedidos dos clientes de teste
  if (ctx.customerAId) await pool.query('DELETE FROM orders WHERE customer_id = $1', [ctx.customerAId]);
  if (ctx.customerBId) await pool.query('DELETE FROM orders WHERE customer_id = $1', [ctx.customerBId]);

  // Deletar produtos de teste
  if (ctx.product1Id) await pool.query('DELETE FROM products WHERE id = $1', [ctx.product1Id]);
  if (ctx.product2Id) await pool.query('DELETE FROM products WHERE id = $1', [ctx.product2Id]);
  if (ctx.product3Id) await pool.query('DELETE FROM products WHERE id = $1', [ctx.product3Id]);

  // Deletar cupons de teste
  if (ctx.coupon1Code) await pool.query('DELETE FROM coupons WHERE code = $1', [ctx.coupon1Code]);
  if (ctx.coupon2Code) await pool.query('DELETE FROM coupons WHERE code = $1', [ctx.coupon2Code]);
  if (ctx.coupon3Code) await pool.query('DELETE FROM coupons WHERE code = $1', [ctx.coupon3Code]);

  // Deletar endereços e clientes de teste
  if (ctx.addressAId) await pool.query('DELETE FROM customer_addresses WHERE id = $1', [ctx.addressAId]);
  if (ctx.addressBId) await pool.query('DELETE FROM customer_addresses WHERE id = $1', [ctx.addressBId]);
  if (ctx.customerAId) await pool.query('DELETE FROM customers WHERE id = $1', [ctx.customerAId]);
  if (ctx.customerBId) await pool.query('DELETE FROM customers WHERE id = $1', [ctx.customerBId]);

  console.log('Cleanup concluído');
}

// ============================================================
// TESTES
// ============================================================
async function runTests(ctx) {
  const { adminToken, tokenA, customerAId, addressAId, tokenB, customerBId, addressBId,
    product1Id, product2Id, product3Id, coupon1Code, coupon2Code, coupon2Id, coupon3Code } = ctx;

  // ============================================================
  console.log('\n--- PEDIDO NORMAL ---');

  // 1. Criar pedido normal
  const order1 = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 2 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
  }, tokenA);

  check('Criar pedido normal (201 + success)', order1.status === 201 && order1.body?.success === true, `status=${order1.status}`);
  check('Pedido retorna order_id', !!order1.body?.order_id);
  check('Pedido retorna order_number (sequence)', typeof order1.body?.order_number === 'number' && order1.body.order_number >= 1001, `order_number=${order1.body?.order_number}`);
  check('Subtotal recalculado pelo banco (2 × 8.50 = 17)', Number(order1.body?.subtotal) === 17, `subtotal=${order1.body?.subtotal}`);
  check('Frete recalculado pelo backend', Number(order1.body?.freight) > 0, `freight=${order1.body?.freight}`);
  check('Total = subtotal + freight', Math.abs(Number(order1.body?.total) - (Number(order1.body?.subtotal) + Number(order1.body?.freight))) < 0.01, `total=${order1.body?.total}`);
  check('Discount = 0 (sem cupom)', Number(order1.body?.discount) === 0);
  check('Coupon_code vazio (sem cupom)', order1.body?.coupon_code === '');
  check('Distance_km retornado', Number(order1.body?.distance_km) > 0, `distance_km=${order1.body?.distance_km}`);

  const orderId1 = order1.body?.order_id;

  // 2. Buscar pedido por ID (próprio cliente)
  const getOrder = await req('GET', `/orders/${orderId1}`, null, tokenA);
  check('GET /orders/:id retorna pedido (200)', getOrder.status === 200 && getOrder.body?.id === orderId1);
  check('Status = "novo"', getOrder.body?.status === 'novo');
  check('Channel = "online"', getOrder.body?.channel === 'online');
  check('Snapshot de endereço (objeto address)', typeof getOrder.body?.address === 'object' && getOrder.body?.address?.street === 'Rua Alberto Coelho');
  check('Snapshot de items (array)', Array.isArray(getOrder.body?.items) && getOrder.body?.items?.length === 1);
  check('Item preserva product_id do banco', getOrder.body?.items?.[0]?.product_id === product1Id);
  check('Item preserva price do banco (8.50)', Number(getOrder.body?.items?.[0]?.price) === 8.50);
  check('Item preserva quantity', getOrder.body?.items?.[0]?.quantity === 2);
  check('Status_history tem entrada inicial', Array.isArray(getOrder.body?.status_history) && getOrder.body?.status_history?.length === 1);
  check('Status_history[0] status=novo', getOrder.body?.status_history?.[0]?.status === 'novo');
  check('Customer_name no pedido', getOrder.body?.customer_name === 'Cliente A Etapa4');
  check('Customer_phone no pedido', getOrder.body?.customer_phone?.startsWith('51988'));

  // 3. Listar pedidos do cliente
  const listCustomer = await req('GET', `/orders/customer/${customerAId}`, null, tokenA);
  check('GET /orders/customer/:id lista pedidos (200)', listCustomer.status === 200 && Array.isArray(listCustomer.body));
  check('Lista inclui pedido criado', listCustomer.body?.some((o) => o.id === orderId1));

  // 4. Admin lista todos os pedidos
  const listAll = await req('GET', '/orders', null, adminToken);
  check('Admin lista todos os pedidos (200 + array)', listAll.status === 200 && Array.isArray(listAll.body));
  check('Lista admin inclui pedido', listAll.body?.some((o) => o.id === orderId1));

  // ============================================================
  console.log('\n--- ESTOQUE ---');

  // 5. Verificar baixa de estoque no banco
  const stockAfter = await dbQuery('SELECT stock FROM products WHERE id = $1', [product1Id]);
  check('Estoque baixou corretamente (10 - 2 = 8)', Number(stockAfter[0]?.stock) === 8, `stock=${stockAfter[0]?.stock}`);

  // 6. Verificar StockMovement criado
  const movements = await dbQuery('SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY created_date DESC', [product1Id]);
  check('StockMovement criado', movements.length > 0, `count=${movements.length}`);
  check('StockMovement type = "saida"', movements[0]?.type === 'saida');
  check('StockMovement quantity = 2', Number(movements[0]?.quantity) === 2);
  check('StockMovement stock_after = 8', Number(movements[0]?.stock_after) === 8, `stock_after=${movements[0]?.stock_after}`);
  check('StockMovement reason inclui número do pedido', movements[0]?.reason?.includes('#'), `reason=${movements[0]?.reason}`);

  // 7. Estoque insuficiente — deve falhar e não criar pedido
  const stockBefore3 = await dbQuery('SELECT stock FROM products WHERE id = $1', [product3Id]);
  const failOrder = await req('POST', '/orders', {
    items: [{ product_id: product3Id, product_name: 'Refrigerante Teste Etapa4', price: 12.00, quantity: 100 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'dinheiro',
  }, tokenA);
  check('Estoque insuficiente retorna erro (400)', failOrder.status === 400, `status=${failOrder.status}`);
  check('Estoque insuficiente não cria pedido', !failOrder.body?.order_id);

  // 8. Estoque NÃO foi alterado (rollback funcionou)
  const stockAfter3 = await dbQuery('SELECT stock FROM products WHERE id = $1', [product3Id]);
  check('Estoque não foi alterado após falha (5)', Number(stockAfter3[0]?.stock) === Number(stockBefore3[0]?.stock), `before=${stockBefore3[0]?.stock} after=${stockAfter3[0]?.stock}`);

  // 9. Nenhuma StockMovement adicional para o produto que falhou
  const movements3After = await dbQuery('SELECT * FROM stock_movements WHERE product_id = $1', [product3Id]);
  check('Nenhuma StockMovement criada para pedido falhado', movements3After.length === 0, `count=${movements3After.length}`);

  // ============================================================
  console.log('\n--- PREÇO ---');

  // 10. Enviar preço falso — backend deve ignorar e usar preço do banco
  const fakePriceOrder = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 999.99, quantity: 1 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
  }, tokenA);
  check('Pedido com preço falso é criado (201)', fakePriceOrder.status === 201, `status=${fakePriceOrder.status}`);
  check('Subtotal usa preço do BANCO (8.50), não 999.99', Number(fakePriceOrder.body?.subtotal) === 8.50, `subtotal=${fakePriceOrder.body?.subtotal}`);

  // Verificar no pedido salvo
  const fakeOrderGet = await req('GET', `/orders/${fakePriceOrder.body?.order_id}`, null, tokenA);
  check('Item no pedido tem price do banco (8.50)', Number(fakeOrderGet.body?.items?.[0]?.price) === 8.50, `price=${fakeOrderGet.body?.items?.[0]?.price}`);

  // ============================================================
  console.log('\n--- OWNERSHIP ---');

  // 11. Cliente A não pode criar pedido com address_id do cliente B
  const crossAddr = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
    address_id: addressBId,
    customer_id: customerAId,
    payment_method: 'pix',
  }, tokenA);
  check('Cliente A não usa endereço do cliente B (403)', crossAddr.status === 403, `status=${crossAddr.status}`);

  // 12. Cliente A não pode criar pedido para customer_id B
  const crossCust = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
    address_id: addressAId,
    customer_id: customerBId,
    payment_method: 'pix',
  }, tokenA);
  check('Cliente A não cria pedido para customer_id B (403)', crossCust.status === 403, `status=${crossCust.status}`);

  // 13. Cliente A não pode consultar pedidos do cliente B
  const crossList = await req('GET', `/orders/customer/${customerBId}`, null, tokenA);
  check('Cliente A não lista pedidos do cliente B (403)', crossList.status === 403, `status=${crossList.status}`);

  // 14. Cliente A não pode ver pedido do cliente B por ID
  // Criar pedido como cliente B primeiro
  const orderB = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
    address_id: addressBId,
    customer_id: customerBId,
    payment_method: 'pix',
  }, tokenB);
  const orderBId = orderB.body?.order_id;
  const crossGet = await req('GET', `/orders/${orderBId}`, null, tokenA);
  check('Cliente A não vê pedido do cliente B por ID (403)', crossGet.status === 403, `status=${crossGet.status}`);

  // 15. Sem token — não pode criar pedido
  const noToken = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
  });
  check('Sem token não cria pedido (401)', noToken.status === 401, `status=${noToken.status}`);

  // ============================================================
  console.log('\n--- CUPOM ---');

  // 16. Cupom válido aplica desconto
  const couponOrder = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 4 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
    coupon_code: coupon1Code,
  }, tokenA);
  check('Pedido com cupom válido (201)', couponOrder.status === 201, `status=${couponOrder.status}`);
  check('Cupom aplica desconto (10% de 34 = 3.40)', Math.abs(Number(couponOrder.body?.discount) - 3.40) < 0.01, `discount=${couponOrder.body?.discount}`);
  check('Coupon_code retornado', couponOrder.body?.coupon_code === coupon1Code, `coupon_code=${couponOrder.body?.coupon_code}`);
  check('Total = subtotal - discount + freight', Math.abs(Number(couponOrder.body?.total) - (Number(couponOrder.body?.subtotal) - Number(couponOrder.body?.discount) + Number(couponOrder.body?.freight))) < 0.01);

  // 17. used_count incrementou
  const coupon1After = await dbQuery('SELECT used_count, used_by FROM coupons WHERE code = $1', [coupon1Code]);
  check('used_count incrementou (1)', Number(coupon1After[0]?.used_count) === 1, `used_count=${coupon1After[0]?.used_count}`);

  // 18. used_by registra customer_id
  const usedByArr = Array.isArray(coupon1After[0]?.used_by) ? coupon1After[0].used_by : [];
  check('used_by registra customer_id', usedByArr.includes(customerAId), `used_by=${JSON.stringify(usedByArr)}`);

  // 19. per_customer_limit — cliente A não pode usar o mesmo cupom novamente
  const reuseCoupon = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
    coupon_code: coupon1Code,
  }, tokenA);
  check('per_customer_limit bloqueia segundo uso (400)', reuseCoupon.status === 400, `status=${reuseCoupon.status}`);

  // 20. used_count NÃO incrementou na tentativa falhada
  const coupon1AfterFail = await dbQuery('SELECT used_count FROM coupons WHERE code = $1', [coupon1Code]);
  check('used_count não incrementou na tentativa falhada (1)', Number(coupon1AfterFail[0]?.used_count) === 1, `used_count=${coupon1AfterFail[0]?.used_count}`);

  // 21. Cupom inexistente
  const invalidCoupon = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
    coupon_code: 'CUPOM_INEXISTENTE_999',
  }, tokenA);
  check('Cupom inexistente retorna erro (400)', invalidCoupon.status === 400, `status=${invalidCoupon.status}`);

  // 22. Cupom com max_uses = 1 — primeiro uso ok
  const coupon2Order = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
    coupon_code: coupon2Code,
  }, tokenA);
  check('Cupom max_uses=1 primeiro uso (201)', coupon2Order.status === 201, `status=${coupon2Order.status}`);

  // 23. Cupom com max_uses = 1 — segundo uso falha
  const coupon2Reuse = await req('POST', '/orders', {
    items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
    coupon_code: coupon2Code,
  }, tokenA);
  check('Cupom max_uses=1 segundo uso falha (400)', coupon2Reuse.status === 400, `status=${coupon2Reuse.status}`);

  // 24. used_count nunca ultrapassa max_uses
  const coupon2Final = await dbQuery('SELECT used_count, max_uses FROM coupons WHERE id = $1', [coupon2Id]);
  check('used_count (1) não ultrapassa max_uses (1)', Number(coupon2Final[0]?.used_count) === 1 && Number(coupon2Final[0]?.used_count) <= Number(coupon2Final[0]?.max_uses), `used_count=${coupon2Final[0]?.used_count} max_uses=${coupon2Final[0]?.max_uses}`);

  // ============================================================
  console.log('\n--- CONCORRÊNCIA DE ESTOQUE ---');

  // 25. Dois pedidos simultâneos para o último item (produto 2, stock=1)
  // Restaurar estoque do produto 2 para 1
  await pool.query('UPDATE products SET stock = 1 WHERE id = $1', [product2Id]);

  const concurrentStock = await Promise.all([
    req('POST', '/orders', {
      items: [{ product_id: product2Id, product_name: 'Destilado Teste Etapa4', price: 45.00, quantity: 1 }],
      address_id: addressAId,
      customer_id: customerAId,
      payment_method: 'pix',
    }, tokenA),
    req('POST', '/orders', {
      items: [{ product_id: product2Id, product_name: 'Destilado Teste Etapa4', price: 45.00, quantity: 1 }],
      address_id: addressBId,
      customer_id: customerBId,
      payment_method: 'pix',
    }, tokenB),
  ]);

  const successCount = concurrentStock.filter((r) => r.status === 201).length;
  const failCount = concurrentStock.filter((r) => r.status === 400).length;
  check('Concorrência: somente 1 pedido aprovado', successCount === 1, `success=${successCount}`);
  check('Concorrência: 1 pedido falha por estoque', failCount === 1, `fail=${failCount}`);

  // 26. Estoque nunca fica negativo
  const stock2Final = await dbQuery('SELECT stock FROM products WHERE id = $1', [product2Id]);
  check('Estoque nunca negativo (0)', Number(stock2Final[0]?.stock) === 0, `stock=${stock2Final[0]?.stock}`);

  // ============================================================
  console.log('\n--- CONCORRÊNCIA DE CUPOM ---');

  // 27. Dois pedidos simultâneos usando cupom com 1 uso restante
  // Criar novo cupom max_uses=1
  const raceCoupon = await req('POST', '/coupons', {
    code: `RACE${Date.now().toString().slice(-4)}`,
    discount_percent: 20,
    max_uses: 1,
    per_customer_limit: 0,
    min_order_value: 0,
    active: true,
  }, adminToken);
  const raceCouponCode = raceCoupon.body?.code;
  const raceCouponId = raceCoupon.body?.id;

  // Restaurar estoque produto 1
  await pool.query('UPDATE products SET stock = 10 WHERE id = $1', [product1Id]);

  const concurrentCoupon = await Promise.all([
    req('POST', '/orders', {
      items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
      address_id: addressAId,
      customer_id: customerAId,
      payment_method: 'pix',
      coupon_code: raceCouponCode,
    }, tokenA),
    req('POST', '/orders', {
      items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
      address_id: addressBId,
      customer_id: customerBId,
      payment_method: 'pix',
      coupon_code: raceCouponCode,
    }, tokenB),
  ]);

  const couponSuccess = concurrentCoupon.filter((r) => r.status === 201).length;
  const couponFail = concurrentCoupon.filter((r) => r.status === 400).length;
  check('Concorrência cupom: somente 1 aplica cupom', couponSuccess === 1, `success=${couponSuccess}`);
  check('Concorrência cupom: 1 falha', couponFail === 1, `fail=${couponFail}`);

  // 28. used_count nunca ultrapassa max_uses
  const raceCouponFinal = await dbQuery('SELECT used_count, max_uses FROM coupons WHERE id = $1', [raceCouponId]);
  check('used_count (1) não ultrapassa max_uses (1)', Number(raceCouponFinal[0]?.used_count) === 1 && Number(raceCouponFinal[0]?.used_count) <= Number(raceCouponFinal[0]?.max_uses), `used_count=${raceCouponFinal[0]?.used_count}`);

  // Cleanup cupom de race
  await pool.query('DELETE FROM stock_movements WHERE product_id = $1', [product1Id]);
  await pool.query('DELETE FROM coupons WHERE id = $1', [raceCouponId]);

  // ============================================================
  console.log('\n--- CONCORRÊNCIA DE ORDER_NUMBER ---');

  // 29. Múltiplos pedidos simultâneos — todos order_number únicos
  await pool.query('UPDATE products SET stock = 50 WHERE id = $1', [product1Id]);

  const concurrentOrders = await Promise.all([
    req('POST', '/orders', {
      items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
      address_id: addressAId,
      customer_id: customerAId,
      payment_method: 'pix',
    }, tokenA),
    req('POST', '/orders', {
      items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
      address_id: addressBId,
      customer_id: customerBId,
      payment_method: 'pix',
    }, tokenB),
    req('POST', '/orders', {
      items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
      address_id: addressAId,
      customer_id: customerAId,
      payment_method: 'dinheiro',
    }, tokenA),
    req('POST', '/orders', {
      items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
      address_id: addressBId,
      customer_id: customerBId,
      payment_method: 'dinheiro',
    }, tokenB),
    req('POST', '/orders', {
      items: [{ product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 }],
      address_id: addressAId,
      customer_id: customerAId,
      payment_method: 'pix',
    }, tokenA),
  ]);

  const orderNumbers = concurrentOrders
    .filter((r) => r.status === 201)
    .map((r) => r.body?.order_number);
  const uniqueNumbers = [...new Set(orderNumbers)];
  check('5 pedidos simultâneos — todos criados (201)', concurrentOrders.every((r) => r.status === 201), `statuses=${concurrentOrders.map((r) => r.status).join(',')}`);
  check('Todos order_number únicos', uniqueNumbers.length === orderNumbers.length, `unique=${uniqueNumbers.length} total=${orderNumbers.length}`);

  // ============================================================
  console.log('\n--- ROLLBACK ---');

  // 30. Simular falha: pedido com 2 produtos, um sem estoque suficiente
  // Produto 1 tem estoque, produto 3 tem estoque 5
  // Pedir 100 de produto 3 → falha após produto 1 ser validado
  const stock1Before = await dbQuery('SELECT stock FROM products WHERE id = $1', [product1Id]);
  const stock3Before = await dbQuery('SELECT stock FROM products WHERE id = $1', [product3Id]);
  const movements1BeforeCount = await dbQuery('SELECT count(*) as count FROM stock_movements WHERE product_id = $1', [product1Id]);
  const movements3BeforeCount = await dbQuery('SELECT count(*) as count FROM stock_movements WHERE product_id = $1', [product3Id]);

  const rollbackOrder = await req('POST', '/orders', {
    items: [
      { product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 2 },
      { product_id: product3Id, product_name: 'Refrigerante Teste Etapa4', price: 12.00, quantity: 100 },
    ],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
  }, tokenA);

  check('Rollback: pedido falha (400)', rollbackOrder.status === 400, `status=${rollbackOrder.status}`);
  check('Rollback: pedido não criado', !rollbackOrder.body?.order_id);

  // 31. Estoque do produto 1 NÃO foi alterado (rollback)
  const stock1After = await dbQuery('SELECT stock FROM products WHERE id = $1', [product1Id]);
  check('Rollback: estoque produto 1 não alterado', Number(stock1After[0]?.stock) === Number(stock1Before[0]?.stock), `before=${stock1Before[0]?.stock} after=${stock1After[0]?.stock}`);

  // 32. Estoque do produto 3 NÃO foi alterado (rollback)
  const stock3After = await dbQuery('SELECT stock FROM products WHERE id = $1', [product3Id]);
  check('Rollback: estoque produto 3 não alterado', Number(stock3After[0]?.stock) === Number(stock3Before[0]?.stock), `before=${stock3Before[0]?.stock} after=${stock3After[0]?.stock}`);

  // 33. Nenhuma StockMovement criada para o pedido falhado (comparar count antes/depois)
  const movements1AfterCount = await dbQuery('SELECT count(*) as count FROM stock_movements WHERE product_id = $1', [product1Id]);
  const movements3AfterCount = await dbQuery('SELECT count(*) as count FROM stock_movements WHERE product_id = $1', [product3Id]);
  check('Rollback: nenhuma StockMovement nova para produto 1', Number(movements1AfterCount[0]?.count) === Number(movements1BeforeCount[0]?.count), `before=${movements1BeforeCount[0]?.count} after=${movements1AfterCount[0]?.count}`);
  check('Rollback: nenhuma StockMovement nova para produto 3', Number(movements3AfterCount[0]?.count) === Number(movements3BeforeCount[0]?.count), `before=${movements3BeforeCount[0]?.count} after=${movements3AfterCount[0]?.count}`);

  // 34. Cupom NÃO consumido em pedido falhado
  // Criar cupom novo para este teste
  const rollbackCoupon = await req('POST', '/coupons', {
    code: `ROLLBACK${Date.now().toString().slice(-4)}`,
    discount_percent: 10,
    max_uses: 1,
    per_customer_limit: 0,
    active: true,
  }, adminToken);
  const rollbackCouponCode = rollbackCoupon.body?.code;
  const rollbackCouponId = rollbackCoupon.body?.id;

  const rollbackWithCoupon = await req('POST', '/orders', {
    items: [
      { product_id: product1Id, product_name: 'Cerveja Teste Etapa4', price: 8.50, quantity: 1 },
      { product_id: product3Id, product_name: 'Refrigerante Teste Etapa4', price: 12.00, quantity: 100 },
    ],
    address_id: addressAId,
    customer_id: customerAId,
    payment_method: 'pix',
    coupon_code: rollbackCouponCode,
  }, tokenA);

  check('Rollback com cupom: pedido falha (400)', rollbackWithCoupon.status === 400, `status=${rollbackWithCoupon.status}`);

  const rollbackCouponAfter = await dbQuery('SELECT used_count FROM coupons WHERE id = $1', [rollbackCouponId]);
  check('Rollback: cupom NÃO consumido (used_count = 0)', Number(rollbackCouponAfter[0]?.used_count) === 0, `used_count=${rollbackCouponAfter[0]?.used_count}`);

  // Cleanup cupom de rollback
  await pool.query('DELETE FROM coupons WHERE id = $1', [rollbackCouponId]);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  let ctx;
  try {
    ctx = await setup();
    await runTests(ctx);
  } catch (err) {
    console.error('Erro durante os testes:', err);
  } finally {
    if (ctx) await cleanup(ctx);
  }

  // Relatório
  console.log('\n=== RELATÓRIO ===');
  console.log(`PASS: ${passCount} | FAIL: ${failCount}`);

  const failures = results.filter((r) => r.status === 'FAIL');
  if (failures.length > 0) {
    console.log('\nFALHAS:');
    failures.forEach((f) => console.log(`  ❌ ${f.name} — ${f.detail || ''}`));
  }

  await pool.end();
  return { passCount, failCount, results };
}

main().then((r) => console.log(JSON.stringify({ passCount: r.passCount, failCount: r.failCount }, null, 2))).catch((e) => console.error(e));