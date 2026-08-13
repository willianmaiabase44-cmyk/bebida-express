// ============================================================
// runTestsEtapa5.js — Suite de testes da Etapa 5
// ============================================================
// Testa:
//   1. CRUD de motoboys
//   2. Pedidos do motoboy (active/history)
//   3. Atribuição transacional de motoboy
//   4. Aceite de entrega
//   5. Entrega transacional (deliver)
//   6. Máquina de status (transições válidas/inválidas)
//   7. Status history
//   8. CRUD de Delivery
//   9. Rota de entrega (freight/route)
//  10. Avaliações de entrega + rating
//  11. Segurança (ownership, permissões)
//  12. Concorrência (atribuição, entrega, avaliação)
//
// Usa PostgreSQL real + API real (localhost:4000).
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

// ============================================================
// SETUP
// ============================================================
async function setup() {
  console.log('\n=== SETUP ===');
  const ctx = {};

  // Admin login
  const adminLogin = await req('POST', '/auth/admin/login', {
    email: 'admin@smokebebidas.com.br',
    password: 'Admin@123456',
  });
  ctx.adminToken = adminLogin.body?.token;
  check('Admin login', !!ctx.adminToken, `status=${adminLogin.status}`);

  // Store settings
  await req('PUT', '/store-settings', {
    store_name: 'Smoke Bebidas',
    cep: '94000-000', street: 'Rua Alberto Coelho', number: '100',
    district: 'Centro', city: 'Gravataí', state: 'RS',
    lat: -29.9416, lng: -51.0895,
    freight_per_km: 2.5, min_freight: 0, free_freight_threshold: 0,
    max_delivery_radius_km: 0, delivery_enabled: true,
    delivery_city: 'Gravataí', delivery_state: 'RS', freight_table: [],
  }, ctx.adminToken);

  // Create motoboys
  const mb1 = await req('POST', '/motoboys', {
    name: 'Motoboy A Etapa5', phone: '51999000001', login: `mb_a_${Date.now()}`,
    password: 'mb123456', vehicle_type: 'moto', plate: 'ABC-1234',
  }, ctx.adminToken);
  ctx.motoboyAId = mb1.body?.id;
  ctx.motoboyALogin = mb1.body?.login;

  const mb2 = await req('POST', '/motoboys', {
    name: 'Motoboy B Etapa5', phone: '51999000002', login: `mb_b_${Date.now()}`,
    password: 'mb123456', vehicle_type: 'moto', plate: 'DEF-5678',
  }, ctx.adminToken);
  ctx.motoboyBId = mb2.body?.id;
  ctx.motoboyBLogin = mb2.body?.login;

  // Inactive motoboy
  const mb3 = await req('POST', '/motoboys', {
    name: 'Motoboy Inativo Etapa5', phone: '51999000003', login: `mb_i_${Date.now()}`,
    password: 'mb123456', vehicle_type: 'moto', active: false,
  }, ctx.adminToken);
  ctx.motoboyInactiveId = mb3.body?.id;
  ctx.motoboyInactiveLogin = mb3.body?.login;

  // Motoboy tokens
  const mbALogin = await req('POST', '/auth/motoboy', { login: ctx.motoboyALogin, password: 'mb123456' });
  ctx.motoboyAToken = mbALogin.body?.token;

  const mbBLogin = await req('POST', '/auth/motoboy', { login: ctx.motoboyBLogin, password: 'mb123456' });
  ctx.motoboyBToken = mbBLogin.body?.token;

  // Inactive motoboy should NOT login
  const mbInactiveLogin = await req('POST', '/auth/motoboy', { login: ctx.motoboyInactiveLogin, password: 'mb123456' });
  check('Motoboy inativo não autentica', mbInactiveLogin.status === 403, `status=${mbInactiveLogin.status}`);

  // Customers
  const phoneA = `51988${Date.now().toString().slice(-6)}`;
  const custA = await req('POST', '/auth/customer', { phone: phoneA, name: 'Cliente A Etapa5' });
  ctx.tokenA = custA.body?.token;
  ctx.customerAId = custA.body?.customer?.id;

  const addrA = await req('POST', '/addresses', {
    customer_id: ctx.customerAId, label: 'Casa', cep: '94000-000',
    street: 'Rua Alberto Coelho', number: '200', district: 'Centro',
    city: 'Gravataí', state: 'RS', lat: -29.942, lng: -51.090,
  }, ctx.tokenA);
  ctx.addressAId = addrA.body?.id;

  const phoneB = `51977${Date.now().toString().slice(-6)}`;
  const custB = await req('POST', '/auth/customer', { phone: phoneB, name: 'Cliente B Etapa5' });
  ctx.tokenB = custB.body?.token;
  ctx.customerBId = custB.body?.customer?.id;

  const addrB = await req('POST', '/addresses', {
    customer_id: ctx.customerBId, label: 'Casa', cep: '94000-000',
    street: 'Rua Alberto Coelho', number: '300', district: 'Centro',
    city: 'Gravataí', state: 'RS', lat: -29.943, lng: -51.091,
  }, ctx.tokenB);
  ctx.addressBId = addrB.body?.id;

  // Products
  const prod1 = await req('POST', '/products', {
    name: 'Cerveja Etapa5', category: 'cervejas', price: 8.50,
    cost_price: 5.00, stock: 100, min_stock: 5, active: true,
  }, ctx.adminToken);
  ctx.product1Id = prod1.body?.id;

  return ctx;
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup(ctx) {
  console.log('\n=== CLEANUP ===');
  const ids = [ctx.motoboyAId, ctx.motoboyBId, ctx.motoboyInactiveId];
  for (const mid of ids) {
    if (mid) {
      await pool.query('DELETE FROM delivery_reviews WHERE motoboy_id = $1', [mid]);
      await pool.query('UPDATE orders SET motoboy_id = NULL WHERE motoboy_id = $1', [mid]);
      await pool.query('DELETE FROM deliveries WHERE motoboy_id = $1', [mid]);
      await pool.query('DELETE FROM delivery_drivers WHERE id = $1', [mid]);
    }
  }
  if (ctx.customerAId) {
    await pool.query('DELETE FROM orders WHERE customer_id = $1', [ctx.customerAId]);
    await pool.query('DELETE FROM customer_addresses WHERE customer_id = $1', [ctx.customerAId]);
    await pool.query('DELETE FROM customers WHERE id = $1', [ctx.customerAId]);
  }
  if (ctx.customerBId) {
    await pool.query('DELETE FROM orders WHERE customer_id = $1', [ctx.customerBId]);
    await pool.query('DELETE FROM customer_addresses WHERE customer_id = $1', [ctx.customerBId]);
    await pool.query('DELETE FROM customers WHERE id = $1', [ctx.customerBId]);
  }
  if (ctx.product1Id) {
    await pool.query('DELETE FROM stock_movements WHERE product_id = $1', [ctx.product1Id]);
    await pool.query('DELETE FROM products WHERE id = $1', [ctx.product1Id]);
  }
  if (ctx.deliveryId) {
    await pool.query('DELETE FROM deliveries WHERE id = $1', [ctx.deliveryId]);
  }
  console.log('Cleanup concluído');
}

// ============================================================
// Helper: create order and advance to pronto
// ============================================================
async function createOrderReady(ctx, token, customerId, addressId) {
  const order = await req('POST', '/orders', {
    items: [{ product_id: ctx.product1Id, product_name: 'Cerveja Etapa5', price: 8.50, quantity: 2 }],
    address_id: addressId, customer_id: customerId, payment_method: 'pix',
  }, token);
  const orderId = order.body?.order_id;

  // Advance: novo → confirmado → em_preparacao → pronto
  await req('PATCH', `/orders/${orderId}/status`, { status: 'confirmado' }, ctx.adminToken);
  await req('PATCH', `/orders/${orderId}/status`, { status: 'em_preparacao' }, ctx.adminToken);
  await req('PATCH', `/orders/${orderId}/status`, { status: 'pronto' }, ctx.adminToken);

  return orderId;
}

// Helper: create order, advance to pronto, assign motoboy (→ saiu_para_entrega)
async function createOrderInDelivery(ctx, token, customerId, addressId, motoboyId) {
  const orderId = await createOrderReady(ctx, token, customerId, addressId);
  await req('PATCH', `/orders/${orderId}/assign-driver`, { motoboy_id: motoboyId }, ctx.adminToken);
  return orderId;
}

// ============================================================
// TESTES
// ============================================================
async function runTests(ctx) {
  const { adminToken, motoboyAToken, motoboyBToken, motoboyAId, motoboyBId,
    motoboyInactiveId, tokenA, tokenB, customerAId, customerBId,
    addressAId, addressBId, product1Id } = ctx;

  // ============================================================
  console.log('\n--- CRUD MOTOBOYS ---');

  // 1. Listar motoboys
  const list = await req('GET', '/motoboys', null, adminToken);
  check('GET /motoboys lista (200 + array)', list.status === 200 && Array.isArray(list.body));
  check('Lista inclui motoboy A', list.body?.some((m) => m.id === motoboyAId));

  // 2. Buscar por ID
  const getMb = await req('GET', `/motoboys/${motoboyAId}`, null, adminToken);
  check('GET /motoboys/:id (200)', getMb.status === 200 && getMb.body?.id === motoboyAId);
  check('Motoboy não expõe password_hash', !getMb.body?.password_hash);
  check('Motoboy não expõe password_salt', !getMb.body?.password_salt);

  // 3. Login único
  const dupLogin = await req('POST', '/motoboys', {
    name: 'Duplicado', phone: '51999000099', login: ctx.motoboyALogin,
    password: 'mb123456',
  }, adminToken);
  check('Login duplicado rejeitado (409)', dupLogin.status === 409, `status=${dupLogin.status}`);

  // 4. Atualizar motoboy
  const upd = await req('PUT', `/motoboys/${motoboyAId}`, { plate: 'XYZ-9999' }, adminToken);
  check('PUT /motoboys/:id atualiza (200)', upd.status === 200 && upd.body?.plate === 'XYZ-9999');

  // 5. Atualizar senha
  const updPass = await req('PUT', `/motoboys/${motoboyAId}`, { password: 'newpass123' }, adminToken);
  check('PUT /motoboys/:id atualiza senha (200)', updPass.status === 200);
  const newLogin = await req('POST', '/auth/motoboy', { login: ctx.motoboyALogin, password: 'newpass123' });
  check('Nova senha funciona', !!newLogin.body?.token, `status=${newLogin.status}`);
  // Reverter senha
  await req('PUT', `/motoboys/${motoboyAId}`, { password: 'mb123456' }, adminToken);

  // 6. Cliente não lista motoboys
  const custList = await req('GET', '/motoboys', null, tokenA);
  check('Cliente não lista motoboys (403)', custList.status === 403, `status=${custList.status}`);

  // 7. Motoboy não lista motoboys
  const mbList = await req('GET', '/motoboys', null, motoboyAToken);
  check('Motoboy não lista motoboys (403)', mbList.status === 403, `status=${mbList.status}`);

  // ============================================================
  console.log('\n--- PEDIDOS DO MOTOBOY ---');

  // 8. Criar pedido para motoboy A
  const orderForMb = await createOrderInDelivery(ctx, tokenA, customerAId, addressAId, motoboyAId);

  // 9. Motoboy A lista pedidos ativos
  const activeOrders = await req('GET', `/motoboys/${motoboyAId}/orders?type=active`, null, motoboyAToken);
  check('Motoboy lista pedidos ativos (200 + array)', activeOrders.status === 200 && Array.isArray(activeOrders.body));
  check('Lista ativos inclui pedido', activeOrders.body?.some((o) => o.id === orderForMb));
  check('Pedidos ativos só tem pronto/saiu_para_entrega',
    activeOrders.body?.every((o) => ['pronto', 'saiu_para_entrega'].includes(o.status)));

  // 10. Motoboy B não lista pedidos do motoboy A
  const crossList = await req('GET', `/motoboys/${motoboyAId}/orders`, null, motoboyBToken);
  check('Motoboy B não lista pedidos do motoboy A (403)', crossList.status === 403, `status=${crossList.status}`);

  // 11. Admin lista pedidos de qualquer motoboy
  const adminList = await req('GET', `/motoboys/${motoboyAId}/orders`, null, adminToken);
  check('Admin lista pedidos de qualquer motoboy (200)', adminList.status === 200, `status=${adminList.status}`);

  // ============================================================
  console.log('\n--- ATRIBUIÇÃO DE MOTOBOY ---');

  // 12. Atribuição com sucesso
  const orderToAssign = await createOrderReady(ctx, tokenB, customerBId, addressBId);
  const assign = await req('PATCH', `/orders/${orderToAssign}/assign-driver`, { motoboy_id: motoboyBId }, adminToken);
  check('Atribuição com sucesso (200)', assign.status === 200, `status=${assign.status}`);
  check('Atribuição retorna motoboy_name', !!assign.body?.motoboy_name);

  // 13. Verificar no banco
  const assignedOrder = await dbQuery('SELECT * FROM orders WHERE id = $1', [orderToAssign]);
  check('Order.motoboy_id atualizado', assignedOrder[0]?.motoboy_id === motoboyBId);
  check('Order.motoboy_name preenchido', !!assignedOrder[0]?.motoboy_name);
  check('Order.motoboy_assigned_at preenchido', !!assignedOrder[0]?.motoboy_assigned_at);
  check('Order.status = saiu_para_entrega', assignedOrder[0]?.status === 'saiu_para_entrega');

  // 14. Motoboy ficou ocupado
  const driverB = await dbQuery('SELECT status FROM delivery_drivers WHERE id = $1', [motoboyBId]);
  check('Motoboy ficou ocupado', driverB[0]?.status === 'ocupado');

  // 15. Status history registrou
  const history = assignedOrder[0]?.status_history;
  const lastEntry = Array.isArray(history) ? history[history.length - 1] : null;
  check('Status_history tem entrada de atribuição', lastEntry?.status === 'saiu_para_entrega');
  check('Status_history by contém "admin"', String(lastEntry?.by).includes('admin'));

  // 16. Cliente não atribui motoboy
  const custAssign = await req('PATCH', `/orders/${orderToAssign}/assign-driver`, { motoboy_id: motoboyAId }, tokenA);
  check('Cliente não atribui motoboy (403)', custAssign.status === 403, `status=${custAssign.status}`);

  // 17. Motoboy inexistente
  const orderToAssign2 = await createOrderReady(ctx, tokenA, customerAId, addressAId);
  const badAssign = await req('PATCH', `/orders/${orderToAssign2}/assign-driver`, { motoboy_id: '00000000-0000-0000-0000-000000000000' }, adminToken);
  check('Motoboy inexistente rejeitado (404)', badAssign.status === 404, `status=${badAssign.status}`);

  // 18. Motoboy inativo
  const inactiveAssign = await req('PATCH', `/orders/${orderToAssign2}/assign-driver`, { motoboy_id: motoboyInactiveId }, adminToken);
  check('Motoboy inativo rejeitado (400)', inactiveAssign.status === 400, `status=${inactiveAssign.status}`);

  // 19. Pedido inválido (já entregue)
  const deliveredOrder = await createOrderInDelivery(ctx, tokenA, customerAId, addressAId, motoboyAId);
  await req('PATCH', `/orders/${deliveredOrder}/deliver`, null, motoboyAToken);
  const assignDelivered = await req('PATCH', `/orders/${deliveredOrder}/assign-driver`, { motoboy_id: motoboyBId }, adminToken);
  check('Atribuição em pedido entregue rejeitada (400)', assignDelivered.status === 400, `status=${assignDelivered.status}`);

  // 20. Sem motoboy_id
  const noMb = await req('PATCH', `/orders/${orderToAssign2}/assign-driver`, {}, adminToken);
  check('Sem motoboy_id rejeitado (400)', noMb.status === 400, `status=${noMb.status}`);

  // ============================================================
  console.log('\n--- ACEITE DO MOTOBOY ---');

  // 21. Aceite com sucesso
  // Criar pedido, avançar para pronto, setar motoboy_id diretamente no DB
  const orderToAccept = await createOrderReady(ctx, tokenA, customerAId, addressAId);
  await pool.query('UPDATE orders SET motoboy_id = $2, motoboy_name = $3 WHERE id = $1',
    [orderToAccept, motoboyAId, 'Motoboy A Etapa5']);
  const accept = await req('PATCH', `/orders/${orderToAccept}/accept-delivery`, null, motoboyAToken);
  check('Aceite com sucesso (200)', accept.status === 200, `status=${accept.status}`);

  const acceptedOrder = await dbQuery('SELECT * FROM orders WHERE id = $1', [orderToAccept]);
  check('Status = saiu_para_entrega após aceite', acceptedOrder[0]?.status === 'saiu_para_entrega');
  check('accepted_at preenchido', !!acceptedOrder[0]?.accepted_at);

  const driverAfterAccept = await dbQuery('SELECT status FROM delivery_drivers WHERE id = $1', [motoboyAId]);
  check('Motoboy ficou ocupado após aceite', driverAfterAccept[0]?.status === 'ocupado');

  // 22. Motoboy errado não aceita
  const orderToAccept2 = await createOrderReady(ctx, tokenB, customerBId, addressBId);
  await pool.query('UPDATE orders SET motoboy_id = $2, motoboy_name = $3 WHERE id = $1',
    [orderToAccept2, motoboyAId, 'Motoboy A Etapa5']);
  const wrongAccept = await req('PATCH', `/orders/${orderToAccept2}/accept-delivery`, null, motoboyBToken);
  check('Motoboy B não aceita pedido do motoboy A (403)', wrongAccept.status === 403, `status=${wrongAccept.status}`);

  // 23. Status inválido (não está pronto) — criar pedido e avançar só até confirmado
  const orderNotReadyRes = await req('POST', '/orders', {
    items: [{ product_id: ctx.product1Id, product_name: 'Cerveja Etapa5', price: 8.50, quantity: 2 }],
    address_id: addressAId, customer_id: customerAId, payment_method: 'pix',
  }, tokenA);
  const orderNotReady = orderNotReadyRes.body?.order_id;
  await req('PATCH', `/orders/${orderNotReady}/status`, { status: 'confirmado' }, adminToken);
  await pool.query('UPDATE orders SET motoboy_id = $2 WHERE id = $1', [orderNotReady, motoboyAId]);
  const acceptNotReady = await req('PATCH', `/orders/${orderNotReady}/accept-delivery`, null, motoboyAToken);
  check('Aceite com status inválido rejeitado (400)', acceptNotReady.status === 400, `status=${acceptNotReady.status}`);

  // 24. Admin não aceita entrega
  const adminAccept = await req('PATCH', `/orders/${orderToAccept2}/accept-delivery`, null, adminToken);
  check('Admin não aceita entrega (403)', adminAccept.status === 403, `status=${adminAccept.status}`);

  // ============================================================
  console.log('\n--- ENTREGA ---');

  // 25. Entrega com sucesso
  const orderToDeliver = await createOrderInDelivery(ctx, tokenA, customerAId, addressAId, motoboyAId);
  const deliver = await req('PATCH', `/orders/${orderToDeliver}/deliver`, null, motoboyAToken);
  check('Entrega com sucesso (200)', deliver.status === 200, `status=${deliver.status}`);

  const deliveredOrderDb = await dbQuery('SELECT * FROM orders WHERE id = $1', [orderToDeliver]);
  check('Status = entregue', deliveredOrderDb[0]?.status === 'entregue');
  check('delivered_at preenchido', !!deliveredOrderDb[0]?.delivered_at);

  // 26. total_deliveries incrementou
  const driverAfterDeliver = await dbQuery('SELECT total_deliveries, status FROM delivery_drivers WHERE id = $1', [motoboyAId]);
  check('total_deliveries incrementou', driverAfterDeliver[0]?.total_deliveries >= 1, `total=${driverAfterDeliver[0]?.total_deliveries}`);
  check('Motoboy voltou disponível', driverAfterDeliver[0]?.status === 'disponivel');

  // 27. Segunda tentativa bloqueada
  const doubleDeliver = await req('PATCH', `/orders/${orderToDeliver}/deliver`, null, motoboyAToken);
  check('Segunda entrega bloqueada (400)', doubleDeliver.status === 400, `status=${doubleDeliver.status}`);

  // 28. Motoboy errado não entrega
  const orderToDeliver2 = await createOrderInDelivery(ctx, tokenB, customerBId, addressBId, motoboyBId);
  const wrongDeliver = await req('PATCH', `/orders/${orderToDeliver2}/deliver`, null, motoboyAToken);
  check('Motoboy A não entrega pedido do motoboy B (403)', wrongDeliver.status === 403, `status=${wrongDeliver.status}`);

  // 29. Admin não entrega
  const adminDeliver = await req('PATCH', `/orders/${orderToDeliver2}/deliver`, null, adminToken);
  check('Admin não entrega (403)', adminDeliver.status === 403, `status=${adminDeliver.status}`);

  // 30. Status history da entrega
  const deliverHistory = deliveredOrderDb[0]?.status_history;
  const deliverEntry = Array.isArray(deliverHistory) ? deliverHistory[deliverHistory.length - 1] : null;
  check('Status_history registrou entregue', deliverEntry?.status === 'entregue');
  check('Status_history by = motoboy', deliverEntry?.by === 'motoboy');

  // ============================================================
  console.log('\n--- MÁQUINA DE STATUS ---');

  // 31. Transições válidas
  const orderStatus = await createOrderReady(ctx, tokenA, customerAId, addressAId);
  // Já passou novo → confirmado → em_preparacao → pronto no createOrderReady
  const toSaiu = await req('PATCH', `/orders/${orderStatus}/status`, { status: 'saiu_para_entrega' }, adminToken);
  check('Transição pronto → saiu_para_entrega (200)', toSaiu.status === 200, `status=${toSaiu.status}`);

  const toEntregue = await req('PATCH', `/orders/${orderStatus}/status`, { status: 'entregue' }, adminToken);
  check('Transição saiu_para_entrega → entregue (200)', toEntregue.status === 200, `status=${toEntregue.status}`);

  // 32. Transição inválida: entregue → novo
  const backToNovo = await req('PATCH', `/orders/${orderStatus}/status`, { status: 'novo' }, adminToken);
  check('Transição entregue → novo bloqueada (400)', backToNovo.status === 400, `status=${backToNovo.status}`);

  // 33. Transição inválida: cancelado → novo
  const orderToCancel = await createOrderReady(ctx, tokenA, customerAId, addressAId);
  await req('PATCH', `/orders/${orderToCancel}/status`, { status: 'cancelado' }, adminToken);
  const cancelToNovo = await req('PATCH', `/orders/${orderToCancel}/status`, { status: 'novo' }, adminToken);
  check('Transição cancelado → novo bloqueada (400)', cancelToNovo.status === 400, `status=${cancelToNovo.status}`);

  // 34. Status inválido
  const invalidStatus = await req('PATCH', `/orders/${orderToCancel}/status`, { status: 'invalid' }, adminToken);
  check('Status inválido bloqueado (400)', invalidStatus.status === 400, `status=${invalidStatus.status}`);

  // 35. Cliente não altera status
  const custStatus = await req('PATCH', `/orders/${orderToCancel}/status`, { status: 'novo' }, tokenA);
  check('Cliente não altera status (403)', custStatus.status === 403, `status=${custStatus.status}`);

  // 36. Status history registrou todas as transições
  const statusOrderDb = await dbQuery('SELECT status_history FROM orders WHERE id = $1', [orderStatus]);
  const statusHistory = statusOrderDb[0]?.status_history;
  check('Status_history tem múltiplas entradas', Array.isArray(statusHistory) && statusHistory.length >= 4);
  check('Status_history[0] status=novo', statusHistory?.[0]?.status === 'novo');

  // ============================================================
  console.log('\n--- CRUD DELIVERY ---');

  // 37. Criar delivery
  const delivCreate = await req('POST', '/deliveries', {
    client_name: 'Cliente Delivery', client_phone: '51999000010',
    address: 'Rua Teste, 100 - Centro - Gravataí/RS',
    reference: 'Portão azul', items_description: '2x Cerveja, 1x Gelo',
    total: 25.00, motoboy_id: motoboyAId, motoboy_name: 'Motoboy A Etapa5',
    status: 'pendente', lat: -29.942, lng: -51.090, date: new Date().toISOString().split('T')[0],
  }, adminToken);
  check('POST /deliveries cria (201)', delivCreate.status === 201, `status=${delivCreate.status}`);
  ctx.deliveryId = delivCreate.body?.id;

  // 38. Listar deliveries
  const delivList = await req('GET', '/deliveries', null, adminToken);
  check('GET /deliveries lista (200 + array)', delivList.status === 200 && Array.isArray(delivList.body));
  check('Lista inclui delivery criado', delivList.body?.some((d) => d.id === ctx.deliveryId));

  // 39. Buscar por ID
  const delivGet = await req('GET', `/deliveries/${ctx.deliveryId}`, null, adminToken);
  check('GET /deliveries/:id (200)', delivGet.status === 200 && delivGet.body?.id === ctx.deliveryId);

  // 40. Atualizar delivery
  const delivUpd = await req('PUT', `/deliveries/${ctx.deliveryId}`, { total: 30.00 }, adminToken);
  check('PUT /deliveries/:id atualiza (200)', delivUpd.status === 200 && Number(delivUpd.body?.total) === 30);

  // 41. Alterar status da entrega
  const delivStatus = await req('PATCH', `/deliveries/${ctx.deliveryId}/status`, { status: 'em_rota' }, adminToken);
  check('PATCH /deliveries/:id/status (200)', delivStatus.status === 200 && delivStatus.body?.status === 'em_rota');

  // 42. Status inválido
  const delivBadStatus = await req('PATCH', `/deliveries/${ctx.deliveryId}/status`, { status: 'invalid' }, adminToken);
  check('Status inválido de delivery bloqueado (400)', delivBadStatus.status === 400, `status=${delivBadStatus.status}`);

  // 43. Cliente não lista deliveries
  const custDeliv = await req('GET', '/deliveries', null, tokenA);
  check('Cliente não lista deliveries (403)', custDeliv.status === 403, `status=${custDeliv.status}`);

  // ============================================================
  console.log('\n--- ROTA DE ENTREGA ---');

  // 44. POST /freight/route
  const routeRes = await req('POST', '/freight/route', {
    lat: -29.942, lng: -51.090,
  }, adminToken);
  check('POST /freight/route (200)', routeRes.status === 200, `status=${routeRes.status}`);
  check('Route retorna store_lat', routeRes.body?.store_lat != null);
  check('Route retorna store_lon', routeRes.body?.store_lon != null);
  check('Route retorna client_lat', routeRes.body?.client_lat != null);
  check('Route retorna client_lon', routeRes.body?.client_lon != null);
  check('Route retorna route_geometry (array)', Array.isArray(routeRes.body?.route_geometry));
  check('Route retorna distance', routeRes.body?.distance != null);

  // ============================================================
  console.log('\n--- AVALIAÇÕES ---');

  // 45. Criar avaliação
  const orderToReview = await createOrderInDelivery(ctx, tokenA, customerAId, addressAId, motoboyAId);
  await req('PATCH', `/orders/${orderToReview}/deliver`, null, motoboyAToken);

  const review = await req('POST', '/reviews', {
    order_id: orderToReview, customer_id: customerAId, rating: 5, comment: 'Excelente entrega',
  }, tokenA);
  check('POST /reviews cria (201)', review.status === 201, `status=${review.status}`);
  check('Review tem rating=5', review.body?.rating === 5);
  check('Review tem motoboy_id', review.body?.motoboy_id === motoboyAId);

  // 46. Rating do motoboy atualizado
  const mbAfterReview = await dbQuery('SELECT rating FROM delivery_drivers WHERE id = $1', [motoboyAId]);
  check('Rating do motoboy atualizado', Number(mbAfterReview[0]?.rating) === 5, `rating=${mbAfterReview[0]?.rating}`);

  // 47. Avaliação duplicada bloqueada
  const dupReview = await req('POST', '/reviews', {
    order_id: orderToReview, customer_id: customerAId, rating: 3,
  }, tokenA);
  check('Avaliação duplicada bloqueada (409)', dupReview.status === 409, `status=${dupReview.status}`);

  // 48. Listar avaliações (admin)
  const reviewList = await req('GET', '/reviews', null, adminToken);
  check('GET /reviews lista (200 + array)', reviewList.status === 200 && Array.isArray(reviewList.body));
  check('Lista inclui avaliação', reviewList.body?.some((r) => r.order_id === orderToReview));

  // 49. Buscar avaliação por ID
  const reviewGet = await req('GET', `/reviews/${review.body?.id}`, null, adminToken);
  check('GET /reviews/:id (200)', reviewGet.status === 200 && reviewGet.body?.id === review.body?.id);

  // 50. GET /motoboys/:id/reviews
  const mbReviews = await req('GET', `/motoboys/${motoboyAId}/reviews`, null, adminToken);
  check('GET /motoboys/:id/reviews (200 + array)', mbReviews.status === 200 && Array.isArray(mbReviews.body));
  check('Lista inclui avaliação do motoboy', mbReviews.body?.some((r) => r.motoboy_id === motoboyAId));

  // 51. GET /motoboys/reviews (agregado)
  const allReviews = await req('GET', '/motoboys/reviews', null, adminToken);
  check('GET /motoboys/reviews (200)', allReviews.status === 200, `status=${allReviews.status}`);
  check('Retorna motoboys com reviews', Array.isArray(allReviews.body?.motoboys));
  const mbAgg = allReviews.body?.motoboys?.find((m) => m.id === motoboyAId);
  check('Motoboy A tem reviews_count > 0', mbAgg?.reviews_count > 0, `count=${mbAgg?.reviews_count}`);

  // 52. Rating inválido (< 1)
  const orderToReview2 = await createOrderInDelivery(ctx, tokenA, customerAId, addressAId, motoboyAId);
  await req('PATCH', `/orders/${orderToReview2}/deliver`, null, motoboyAToken);
  const badRating1 = await req('POST', '/reviews', {
    order_id: orderToReview2, customer_id: customerAId, rating: 0,
  }, tokenA);
  check('Rating=0 bloqueado (400)', badRating1.status === 400, `status=${badRating1.status}`);

  // 53. Rating inválido (> 5)
  const badRating2 = await req('POST', '/reviews', {
    order_id: orderToReview2, customer_id: customerAId, rating: 6,
  }, tokenA);
  check('Rating=6 bloqueado (400)', badRating2.status === 400, `status=${badRating2.status}`);

  // 54. Pedido não entregue não pode ser avaliado
  const orderNotDelivered = await createOrderInDelivery(ctx, tokenA, customerAId, addressAId, motoboyAId);
  const reviewNotDelivered = await req('POST', '/reviews', {
    order_id: orderNotDelivered, customer_id: customerAId, rating: 5,
  }, tokenA);
  check('Pedido não entregue não é avaliado (400)', reviewNotDelivered.status === 400, `status=${reviewNotDelivered.status}`);

  // 55. Cliente B não avalia pedido do cliente A
  const reviewCross = await req('POST', '/reviews', {
    order_id: orderToReview2, customer_id: customerBId, rating: 5,
  }, tokenB);
  check('Cliente B não avalia pedido do cliente A (403)', reviewCross.status === 403, `status=${reviewCross.status}`);

  // 56. Sem token não avalia
  const reviewNoAuth = await req('POST', '/reviews', {
    order_id: orderToReview2, customer_id: customerAId, rating: 5,
  });
  check('Sem token não avalia (401)', reviewNoAuth.status === 401, `status=${reviewNoAuth.status}`);

  // 57. Média correta com múltiplas avaliações
  const orderToReview3 = await createOrderInDelivery(ctx, tokenB, customerBId, addressBId, motoboyBId);
  await req('PATCH', `/orders/${orderToReview3}/deliver`, null, motoboyBToken);
  await req('POST', '/reviews', {
    order_id: orderToReview3, customer_id: customerBId, rating: 4, comment: 'Bom',
  }, tokenB);

  const orderToReview4 = await createOrderInDelivery(ctx, tokenB, customerBId, addressBId, motoboyBId);
  await req('PATCH', `/orders/${orderToReview4}/deliver`, null, motoboyBToken);
  await req('POST', '/reviews', {
    order_id: orderToReview4, customer_id: customerBId, rating: 2, comment: 'Lento',
  }, tokenB);

  const mbBRating = await dbQuery('SELECT rating FROM delivery_drivers WHERE id = $1', [motoboyBId]);
  check('Média do motoboy B = 3.0', Number(mbBRating[0]?.rating) === 3.0, `rating=${mbBRating[0]?.rating}`);

  // ============================================================
  console.log('\n--- CONCORRÊNCIA DE ATRIBUIÇÃO ---');

  // 58. Dois admins atribuindo motoboys diferentes ao mesmo pedido
  const raceOrder = await createOrderReady(ctx, tokenA, customerAId, addressAId);
  const raceAssign = await Promise.all([
    req('PATCH', `/orders/${raceOrder}/assign-driver`, { motoboy_id: motoboyAId }, adminToken),
    req('PATCH', `/orders/${raceOrder}/assign-driver`, { motoboy_id: motoboyBId }, adminToken),
  ]);
  const assignSuccess = raceAssign.filter((r) => r.status === 200).length;
  const assignFail = raceAssign.filter((r) => r.status === 400).length;
  check('Concorrência atribuição: somente 1 sucesso', assignSuccess === 1, `success=${assignSuccess}`);
  check('Concorrência atribuição: 1 falha', assignFail === 1, `fail=${assignFail}`);

  // 59. Pedido nunca fica inconsistente
  const raceOrderDb = await dbQuery('SELECT * FROM orders WHERE id = $1', [raceOrder]);
  check('Pedido tem exatamente 1 motoboy', raceOrderDb[0]?.motoboy_id !== null && raceOrderDb[0]?.motoboy_id !== undefined);
  check('Pedido status = saiu_para_entrega', raceOrderDb[0]?.status === 'saiu_para_entrega');

  // ============================================================
  console.log('\n--- CONCORRÊNCIA DE ENTREGA ---');

  // 60. Dois requests de deliver simultâneos
  const raceDeliverOrder = await createOrderInDelivery(ctx, tokenA, customerAId, addressAId, motoboyAId);
  const raceDeliver = await Promise.all([
    req('PATCH', `/orders/${raceDeliverOrder}/deliver`, null, motoboyAToken),
    req('PATCH', `/orders/${raceDeliverOrder}/deliver`, null, motoboyAToken),
  ]);
  const deliverSuccess = raceDeliver.filter((r) => r.status === 200).length;
  const deliverFail = raceDeliver.filter((r) => r.status === 400).length;
  check('Concorrência entrega: somente 1 sucesso', deliverSuccess === 1, `success=${deliverSuccess}`);
  check('Concorrência entrega: 1 falha', deliverFail === 1, `fail=${deliverFail}`);

  // 61. total_deliveries incrementou apenas 1 vez
  const raceDeliverDb = await dbQuery('SELECT status FROM orders WHERE id = $1', [raceDeliverOrder]);
  check('Pedido termina entregue', raceDeliverDb[0]?.status === 'entregue');

  // 62. Motoboy disponível
  const raceMbDb = await dbQuery('SELECT status, total_deliveries FROM delivery_drivers WHERE id = $1', [motoboyAId]);
  check('Motoboy disponível após entrega concorrente', raceMbDb[0]?.status === 'disponivel');

  // ============================================================
  console.log('\n--- CONCORRÊNCIA DE AVALIAÇÃO ---');

  // 63. Duas avaliações simultâneas para o mesmo pedido
  const raceReviewOrder = await createOrderInDelivery(ctx, tokenA, customerAId, addressAId, motoboyAId);
  await req('PATCH', `/orders/${raceReviewOrder}/deliver`, null, motoboyAToken);

  const raceReview = await Promise.all([
    req('POST', '/reviews', { order_id: raceReviewOrder, customer_id: customerAId, rating: 5 }, tokenA),
    req('POST', '/reviews', { order_id: raceReviewOrder, customer_id: customerAId, rating: 3 }, tokenA),
  ]);
  const reviewSuccess = raceReview.filter((r) => r.status === 201).length;
  const reviewFail = raceReview.filter((r) => r.status === 409).length;
  check('Concorrência avaliação: somente 1 sucesso', reviewSuccess === 1, `success=${reviewSuccess}`);
  check('Concorrência avaliação: 1 falha (409)', reviewFail === 1, `fail=${reviewFail}`);

  // 64. Apenas 1 avaliação no banco
  const raceReviewDb = await dbQuery('SELECT count(*) as count FROM delivery_reviews WHERE order_id = $1', [raceReviewOrder]);
  check('Apenas 1 avaliação no banco', Number(raceReviewDb[0]?.count) === 1, `count=${raceReviewDb[0]?.count}`);
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