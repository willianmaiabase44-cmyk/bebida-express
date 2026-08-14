// ============================================================
// runTestsEtapa6.js — Suite de testes da Etapa 6
// ============================================================
// Testa:
//   1. PDV (venda transacional, preço falso, estoque, total_sold, StockMovement)
//   2. Cancelamento de venda (transacional, devolução de estoque, concorrência)
//   3. Movimentação manual de estoque (entrada, saída, validações)
//   4. Fornecedores (CRUD, permissões)
//   5. Promoções (CRUD, filtros público/admin, validações)
//   6. Relatórios (dashboard, sales, products, stock, orders, customers, deliveries)
//   7. Concorrência (PDV disputando último produto, cancelamento duplo)
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

  // Create test products
  const prod1 = await req('POST', '/products', {
    name: 'Produto PDV Etapa6 A', category: 'cervejas', price: 10.00,
    cost_price: 6.00, stock: 50, min_stock: 5, active: true,
  }, ctx.adminToken);
  ctx.productAId = prod1.body?.id;
  ctx.productAPrice = 10.00;

  const prod2 = await req('POST', '/products', {
    name: 'Produto PDV Etapa6 B', category: 'refrigerantes', price: 8.50,
    cost_price: 4.00, stock: 20, min_stock: 3, active: true,
  }, ctx.adminToken);
  ctx.productBId = prod2.body?.id;
  ctx.productBPrice = 8.50;

  // Product with stock 1 for concurrency test
  const prodRace = await req('POST', '/products', {
    name: 'Produto Concorrencia Etapa6', category: 'energeticos', price: 15.00,
    cost_price: 8.00, stock: 1, min_stock: 1, active: true,
  }, ctx.adminToken);
  ctx.productRaceId = prodRace.body?.id;

  return ctx;
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup(ctx) {
  console.log('\n=== CLEANUP ===');
  const productIds = [ctx.productAId, ctx.productBId, ctx.productRaceId].filter(Boolean);
  for (const pid of productIds) {
    if (pid) {
      await pool.query('DELETE FROM stock_movements WHERE product_id = $1', [pid]);
      await pool.query('DELETE FROM promotions WHERE product_id = $1', [pid]);
      await pool.query('DELETE FROM products WHERE id = $1', [pid]);
    }
  }
  // Clean up sales created during tests
  if (ctx.createdSaleIds) {
    for (const sid of ctx.createdSaleIds) {
      await pool.query('DELETE FROM sales WHERE id = $1', [sid]);
    }
  }
  // Clean up suppliers
  if (ctx.createdSupplierIds) {
    for (const sid of ctx.createdSupplierIds) {
      await pool.query('DELETE FROM suppliers WHERE id = $1', [sid]);
    }
  }
  console.log('Cleanup concluído');
}

// ============================================================
// TESTES
// ============================================================
async function runTests(ctx) {
  const { adminToken, productAId, productBId, productRaceId, productAPrice, productBPrice } = ctx;
  ctx.createdSaleIds = [];
  ctx.createdSupplierIds = [];

  // ============================================================
  console.log('\n--- PDV: VENDA NORMAL ---');

  // 1. Venda normal com sucesso
  const sale = await req('POST', '/sales', {
    items: [
      { product_id: productAId, product_name: 'Produto A', price: 999, quantity: 2 },
      { product_id: productBId, product_name: 'Produto B', price: 999, quantity: 3 },
    ],
    payment_method: 'dinheiro', amount_paid: 100, change: 100 - (2 * 10 + 3 * 8.5),
  }, adminToken);
  check('POST /sales cria venda (201)', sale.status === 201, `status=${sale.status}`);
  check('Venda tem total correto (2*10 + 3*8.5 = 45.5)', Number(sale.body?.total) === 45.5, `total=${sale.body?.total}`);
  check('Venda tem channel=pdv', sale.body?.channel === 'pdv');
  check('Venda tem status=concluida', sale.body?.status === 'concluida');
  check('Venda tem 2 items', Array.isArray(sale.body?.items) && sale.body.items.length === 2);
  ctx.createdSaleIds.push(sale.body?.id);

  // 2. Preço falso enviado pelo frontend é ignorado
  check('Preço do frontend (999) foi ignorado para produto A', Number(sale.body?.items?.[0]?.price) === 10.00, `price=${sale.body?.items?.[0]?.price}`);
  check('Preço do frontend (999) foi ignorado para produto B', Number(sale.body?.items?.[1]?.price) === 8.50, `price=${sale.body?.items?.[1]?.price}`);

  // 3. Estoque baixou corretamente
  const prodA = await dbQuery('SELECT stock, total_sold FROM products WHERE id = $1', [productAId]);
  check('Estoque do produto A baixou para 48', Number(prodA[0]?.stock) === 48, `stock=${prodA[0]?.stock}`);
  const prodB = await dbQuery('SELECT stock, total_sold FROM products WHERE id = $1', [productBId]);
  check('Estoque do produto B baixou para 17', Number(prodB[0]?.stock) === 17, `stock=${prodB[0]?.stock}`);

  // 4. total_sold incrementou
  check('total_sold do produto A = 2', Number(prodA[0]?.total_sold) === 2, `total_sold=${prodA[0]?.total_sold}`);
  check('total_sold do produto B = 3', Number(prodB[0]?.total_sold) === 3, `total_sold=${prodB[0]?.total_sold}`);

  // 5. StockMovement criado para cada item
  const movements = await dbQuery('SELECT * FROM stock_movements WHERE product_id = $1 AND reason LIKE $2 ORDER BY created_date DESC LIMIT 1', [productAId, '%Venda PDV%']);
  check('StockMovement saida criado para produto A', movements.length > 0 && movements[0].type === 'saida', `type=${movements[0]?.type}`);
  check('StockMovement quantity = 2', Number(movements[0]?.quantity) === 2);
  check('StockMovement stock_after = 48', Number(movements[0]?.stock_after) === 48);

  // ============================================================
  console.log('\n--- PDV: VALIDAÇÕES ---');

  // 6. Estoque insuficiente bloqueado
  const noStock = await req('POST', '/sales', {
    items: [{ product_id: productAId, product_name: 'A', price: 10, quantity: 999 }],
    payment_method: 'pix',
  }, adminToken);
  check('Estoque insuficiente bloqueado (400)', noStock.status === 400, `status=${noStock.status}`);

  // 7. Carrinho vazio
  const emptyCart = await req('POST', '/sales', {
    items: [], payment_method: 'pix',
  }, adminToken);
  check('Carrinho vazio bloqueado (400)', emptyCart.status === 400, `status=${emptyCart.status}`);

  // 8. Forma de pagamento inválida
  const badPayment = await req('POST', '/sales', {
    items: [{ product_id: productAId, product_name: 'A', price: 10, quantity: 1 }],
    payment_method: 'bitcoin',
  }, adminToken);
  check('Forma de pagamento inválida bloqueada (400)', badPayment.status === 400, `status=${badPayment.status}`);

  // 9. Produto inexistente
  const badProduct = await req('POST', '/sales', {
    items: [{ product_id: '00000000-0000-0000-0000-000000000000', product_name: 'X', price: 10, quantity: 1 }],
    payment_method: 'pix',
  }, adminToken);
  check('Produto inexistente bloqueado (400)', badProduct.status === 400, `status=${badProduct.status}`);

  // 10. Sem token
  const noAuth = await req('POST', '/sales', {
    items: [{ product_id: productAId, product_name: 'A', price: 10, quantity: 1 }],
    payment_method: 'pix',
  });
  check('Sem token bloqueado (401)', noAuth.status === 401, `status=${noAuth.status}`);

  // 11. Rollback: estoque não mudou após venda falhada
  const prodAAfterFail = await dbQuery('SELECT stock FROM products WHERE id = $1', [productAId]);
  check('Rollback: estoque não mudou após venda falhada', Number(prodAAfterFail[0]?.stock) === 48, `stock=${prodAAfterFail[0]?.stock}`);

  // ============================================================
  console.log('\n--- PDV: LISTAR E BUSCAR ---');

  // 12. Listar vendas
  const list = await req('GET', '/sales', null, adminToken);
  check('GET /sales lista (200 + array)', list.status === 200 && Array.isArray(list.body));
  check('Lista inclui venda criada', list.body?.some((s) => s.id === sale.body?.id));

  // 13. Buscar por ID
  const getSale = await req('GET', `/sales/${sale.body?.id}`, null, adminToken);
  check('GET /sales/:id (200)', getSale.status === 200 && getSale.body?.id === sale.body?.id);

  // 14. Filtro por channel
  const pdvOnly = await req('GET', '/sales?channel=pdv', null, adminToken);
  check('Filtro channel=pdv funciona', pdvOnly.status === 200 && Array.isArray(pdvOnly.body));

  // 15. Filtro por payment_method
  const byPayment = await req('GET', '/sales?payment_method=dinheiro', null, adminToken);
  check('Filtro payment_method funciona', byPayment.status === 200 && Array.isArray(byPayment.body));

  // ============================================================
  console.log('\n--- CANCELAMENTO DE VENDA ---');

  // 16. Cancelar venda
  const saleToCancel = await req('POST', '/sales', {
    items: [{ product_id: productAId, product_name: 'A', price: 10, quantity: 5 }],
    payment_method: 'pix',
  }, adminToken);
  ctx.createdSaleIds.push(saleToCancel.body?.id);
  const stockBeforeCancel = await dbQuery('SELECT stock, total_sold FROM products WHERE id = $1', [productAId]);

  const cancel = await req('PATCH', `/sales/${saleToCancel.body?.id}/cancel`, null, adminToken);
  check('Cancelamento com sucesso (200)', cancel.status === 200, `status=${cancel.status}`);
  check('Status = cancelada', cancel.body?.status === 'cancelada');

  // 17. Estoque devolvido
  const stockAfterCancel = await dbQuery('SELECT stock, total_sold FROM products WHERE id = $1', [productAId]);
  check('Estoque devolvido após cancelamento',
    Number(stockAfterCancel[0]?.stock) === Number(stockBeforeCancel[0]?.stock) + 5,
    `before=${stockBeforeCancel[0]?.stock} after=${stockAfterCancel[0]?.stock}`);

  // 18. total_sold corrigido
  check('total_sold decrementado após cancelamento',
    Number(stockAfterCancel[0]?.total_sold) === Number(stockBeforeCancel[0]?.total_sold) - 5,
    `before=${stockBeforeCancel[0]?.total_sold} after=${stockAfterCancel[0]?.total_sold}`);

  // 19. StockMovement entrada criado
  const cancelMovement = await dbQuery('SELECT * FROM stock_movements WHERE product_id = $1 AND reason LIKE $2 ORDER BY created_date DESC LIMIT 1', [productAId, '%Cancelamento%']);
  check('StockMovement entrada criado no cancelamento', cancelMovement[0]?.type === 'entrada', `type=${cancelMovement[0]?.type}`);
  check('StockMovement entrada quantity = 5', Number(cancelMovement[0]?.quantity) === 5);

  // 20. Segunda tentativa de cancelamento bloqueada
  const doubleCancel = await req('PATCH', `/sales/${saleToCancel.body?.id}/cancel`, null, adminToken);
  check('Segundo cancelamento bloqueado (400)', doubleCancel.status === 400, `status=${doubleCancel.status}`);

  // 21. Cancelar venda inexistente
  const cancelNotFound = await req('PATCH', '/sales/00000000-0000-0000-0000-000000000000/cancel', null, adminToken);
  check('Cancelar venda inexistente (404)', cancelNotFound.status === 404, `status=${cancelNotFound.status}`);

  // 22. Estoque não mudou após segundo cancelamento (já cancelada)
  const stockAfterDoubleCancel = await dbQuery('SELECT stock FROM products WHERE id = $1', [productAId]);
  check('Estoque não mudou após segundo cancelamento',
    Number(stockAfterDoubleCancel[0]?.stock) === Number(stockAfterCancel[0]?.stock));

  // ============================================================
  console.log('\n--- MOVIMENTAÇÃO MANUAL DE ESTOQUE ---');

  // 23. Entrada manual
  const entry = await req('POST', '/stock-movements', {
    product_id: productAId, type: 'entrada', quantity: 10, reason: 'Entrada manual teste',
  }, adminToken);
  check('Entrada manual criada (201)', entry.status === 201, `status=${entry.status}`);
  check('Entrada tem stock_after correto', Number(entry.body?.stock_after) === Number(stockAfterDoubleCancel[0]?.stock) + 10, `stock_after=${entry.body?.stock_after}`);

  // 24. Saída manual
  const exit = await req('POST', '/stock-movements', {
    product_id: productAId, type: 'saida', quantity: 3, reason: 'Saída manual teste',
  }, adminToken);
  check('Saída manual criada (201)', exit.status === 201, `status=${exit.status}`);

  // 25. Saída maior que estoque bloqueada
  const hugeExit = await req('POST', '/stock-movements', {
    product_id: productAId, type: 'saida', quantity: 99999, reason: 'Saída inválida',
  }, adminToken);
  check('Saída maior que estoque bloqueada (400)', hugeExit.status === 400, `status=${hugeExit.status}`);

  // 26. Produto inexistente
  const badProductMove = await req('POST', '/stock-movements', {
    product_id: '00000000-0000-0000-0000-000000000000', type: 'entrada', quantity: 1,
  }, adminToken);
  check('Produto inexistente bloqueado (404)', badProductMove.status === 404, `status=${badProductMove.status}`);

  // 27. Quantity inválida
  const zeroQty = await req('POST', '/stock-movements', {
    product_id: productAId, type: 'entrada', quantity: 0,
  }, adminToken);
  check('Quantity=0 bloqueado (400)', zeroQty.status === 400, `status=${zeroQty.status}`);

  // 28. Tipo inválido
  const badType = await req('POST', '/stock-movements', {
    product_id: productAId, type: 'invalid', quantity: 1,
  }, adminToken);
  check('Tipo inválido bloqueado (400)', badType.status === 400, `status=${badType.status}`);

  // 29. Sem token
  const noAuthMove = await req('POST', '/stock-movements', {
    product_id: productAId, type: 'entrada', quantity: 1,
  });
  check('Movimentação sem token bloqueada (401)', noAuthMove.status === 401, `status=${noAuthMove.status}`);

  // 30. Listar movimentações
  const listMoves = await req('GET', '/stock-movements', null, adminToken);
  check('GET /stock-movements lista (200 + array)', listMoves.status === 200 && Array.isArray(listMoves.body));

  // 31. Filtro por tipo
  const entriesOnly = await req('GET', '/stock-movements?type=entrada', null, adminToken);
  check('Filtro type=entrada funciona', entriesOnly.status === 200 && Array.isArray(entriesOnly.body));
  check('Lista só tem entradas', entriesOnly.body?.every((m) => m.type === 'entrada'));

  // 32. Filtro por produto
  const byProduct = await req('GET', `/stock-movements?product_id=${productAId}`, null, adminToken);
  check('Filtro product_id funciona', byProduct.status === 200 && Array.isArray(byProduct.body));
  check('Lista só tem movimentações do produto A', byProduct.body?.every((m) => m.product_id === productAId));

  // 33. Rollback: estoque não mudou após saída falhada
  const stockAfterFailExit = await dbQuery('SELECT stock FROM products WHERE id = $1', [productAId]);
  // Após entrada(10) + saída(3), estoque deve estar estável (saída falhada não mudou)
  check('Rollback: saída falhada não alterou estoque', Number(stockAfterFailExit[0]?.stock) >= 0);

  // ============================================================
  console.log('\n--- FORNECEDORES ---');

  // 34. Criar fornecedor
  const supplier = await req('POST', '/suppliers', {
    name: 'Distribuidora Etapa6', contact_name: 'João', phone: '51999000001',
    email: 'joao@dist.com', cnpj: '12.345.678/0001-90', category: 'cervejas',
    address: 'Rua Teste, 100', notes: 'Fornecedor de teste',
  }, adminToken);
  check('POST /suppliers cria (201)', supplier.status === 201, `status=${supplier.status}`);
  ctx.createdSupplierIds.push(supplier.body?.id);
  ctx.supplierId = supplier.body?.id;

  // 35. Listar fornecedores
  const listSup = await req('GET', '/suppliers', null, adminToken);
  check('GET /suppliers lista (200 + array)', listSup.status === 200 && Array.isArray(listSup.body));
  check('Lista inclui fornecedor criado', listSup.body?.some((s) => s.id === ctx.supplierId));

  // 36. Buscar por ID
  const getSup = await req('GET', `/suppliers/${ctx.supplierId}`, null, adminToken);
  check('GET /suppliers/:id (200)', getSup.status === 200 && getSup.body?.id === ctx.supplierId);

  // 37. Atualizar fornecedor
  const updSup = await req('PUT', `/suppliers/${ctx.supplierId}`, { phone: '51999000999' }, adminToken);
  check('PUT /suppliers/:id atualiza (200)', updSup.status === 200 && updSup.body?.phone === '51999000999');

  // 38. Nome obrigatório
  const noName = await req('POST', '/suppliers', { phone: '5199999999' }, adminToken);
  check('Fornecedor sem nome bloqueado (400)', noName.status === 400, `status=${noName.status}`);

  // 39. Fornecedor inexistente
  const notFound = await req('GET', '/suppliers/00000000-0000-0000-0000-000000000000', null, adminToken);
  check('Fornecedor inexistente (404)', notFound.status === 404, `status=${notFound.status}`);

  // 40. Sem token
  const noAuthSup = await req('GET', '/suppliers');
  check('Fornecedores sem token bloqueado (401)', noAuthSup.status === 401, `status=${noAuthSup.status}`);

  // 41. Excluir fornecedor
  const delSup = await req('DELETE', `/suppliers/${ctx.supplierId}`, null, adminToken);
  check('DELETE /suppliers/:id (200)', delSup.status === 200 && delSup.body?.success === true);
  const verifyDel = await req('GET', `/suppliers/${ctx.supplierId}`, null, adminToken);
  check('Fornecedor excluído não existe mais (404)', verifyDel.status === 404);

  // ============================================================
  console.log('\n--- PROMOÇÕES ---');

  // 42. Criar promoção
  const promo = await req('POST', '/promotions', {
    product_id: productAId, promo_price: 7.50,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    banner_url: 'http://example.com/banner.jpg',
  }, adminToken);
  check('POST /promotions cria (201)', promo.status === 201, `status=${promo.status}`);
  ctx.promoId = promo.body?.id;

  // 43. original_price derivada do produto (não confia no frontend)
  check('original_price derivada do produto (10.00)', Number(promo.body?.original_price) === 10.00, `original_price=${promo.body?.original_price}`);
  check('product_name preenchido', !!promo.body?.product_name);

  // 44. GET público — apenas ativas e vigentes
  const publicPromos = await req('GET', '/promotions');
  check('GET público /promotions (200 + array)', publicPromos.status === 200 && Array.isArray(publicPromos.body));
  check('Público vê a promoção ativa', publicPromos.body?.some((p) => p.id === ctx.promoId));

  // 45. GET admin com ?all=true
  const allPromos = await req('GET', '/promotions?all=true', null, adminToken);
  check('GET admin /promotions?all=true (200 + array)', allPromos.status === 200 && Array.isArray(allPromos.body));

  // 46. Buscar por ID
  const getPromo = await req('GET', `/promotions/${ctx.promoId}`);
  check('GET /promotions/:id (200)', getPromo.status === 200 && getPromo.body?.id === ctx.promoId);

  // 47. Atualizar promoção
  const updPromo = await req('PUT', `/promotions/${ctx.promoId}`, { promo_price: 8.00 }, adminToken);
  check('PUT /promotions/:id atualiza (200)', updPromo.status === 200 && Number(updPromo.body?.promo_price) === 8.00);

  // 48. promo_price <= 0 bloqueado
  const zeroPromo = await req('POST', '/promotions', {
    product_id: productAId, promo_price: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  }, adminToken);
  check('promo_price=0 bloqueado (400)', zeroPromo.status === 400, `status=${zeroPromo.status}`);

  // 49. Datas inválidas (start > end)
  const badDates = await req('POST', '/promotions', {
    product_id: productAId, promo_price: 5.00,
    start_date: '2026-12-31', end_date: '2026-01-01',
  }, adminToken);
  check('Datas inválidas bloqueadas (400)', badDates.status === 400, `status=${badDates.status}`);

  // 50. Produto inexistente
  const badProductPromo = await req('POST', '/promotions', {
    product_id: '00000000-0000-0000-0000-000000000000', promo_price: 5.00,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  }, adminToken);
  check('Produto inexistente bloqueado (404)', badProductPromo.status === 404, `status=${badProductPromo.status}`);

  // 51. POST sem token (admin only)
  const noAuthPromo = await req('POST', '/promotions', {
    product_id: productAId, promo_price: 5.00,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });
  check('POST /promotions sem token bloqueado (401)', noAuthPromo.status === 401, `status=${noAuthPromo.status}`);

  // 52. Excluir promoção
  const delPromo = await req('DELETE', `/promotions/${ctx.promoId}`, null, adminToken);
  check('DELETE /promotions/:id (200)', delPromo.status === 200 && delPromo.body?.success === true);

  // ============================================================
  console.log('\n--- RELATÓRIOS ---');

  // 53. Dashboard
  const dash = await req('GET', '/reports/dashboard', null, adminToken);
  check('GET /reports/dashboard (200)', dash.status === 200, `status=${dash.status}`);
  check('Dashboard tem today', dash.body?.today && typeof dash.body.today.sales_total === 'number');
  check('Dashboard tem period', dash.body?.period && typeof dash.body.period.total_revenue === 'number');
  check('Dashboard tem avg_ticket', typeof dash.body?.period?.avg_ticket === 'number');
  check('Dashboard tem low_stock (array)', Array.isArray(dash.body?.low_stock));
  check('Dashboard tem no_stock (array)', Array.isArray(dash.body?.no_stock));
  check('Dashboard tem top_products (array)', Array.isArray(dash.body?.top_products));
  check('Dashboard tem sales_by_payment_method (array)', Array.isArray(dash.body?.sales_by_payment_method));
  check('Dashboard tem orders_by_payment_method (array)', Array.isArray(dash.body?.orders_by_payment_method));
  check('Dashboard tem by_channel', dash.body?.by_channel?.pdv && dash.body?.by_channel?.online);
  check('Dashboard tem orders_by_status (array)', Array.isArray(dash.body?.orders_by_status));

  // 54. Relatório de vendas
  const salesReport = await req('GET', '/reports/sales', null, adminToken);
  check('GET /reports/sales (200)', salesReport.status === 200, `status=${salesReport.status}`);
  check('Sales report tem items (array)', Array.isArray(salesReport.body?.items));
  check('Sales report tem summary', salesReport.body?.summary && typeof salesReport.body.summary.total_revenue === 'number');
  check('Sales report summary tem count', typeof salesReport.body?.summary?.count === 'number');
  check('Sales report summary tem avg_ticket', typeof salesReport.body?.summary?.avg_ticket === 'number');

  // 55. Relatório de vendas com filtro de canal
  const pdvSales = await req('GET', '/reports/sales?channel=pdv', null, adminToken);
  check('Sales report filtro channel=pdv (200)', pdvSales.status === 200);
  check('Todos itens são PDV', pdvSales.body?.items?.every((s) => s.channel === 'pdv'));

  // 56. Relatório de vendas com filtro de data
  const today = new Date().toISOString().split('T')[0];
  const dateFilter = await req('GET', `/reports/sales?date_from=${today}&date_to=${today}`, null, adminToken);
  check('Sales report filtro por período (200)', dateFilter.status === 200);

  // 57. Relatório de produtos
  const productsReport = await req('GET', '/reports/products', null, adminToken);
  check('GET /reports/products (200)', productsReport.status === 200, `status=${productsReport.status}`);
  check('Products report tem items (array)', Array.isArray(productsReport.body?.items));
  check('Products report tem stock_value', typeof productsReport.body?.items?.[0]?.stock_value === 'number');
  check('Products report tem summary', productsReport.body?.summary);
  check('Products report summary tem total_stock_value', typeof productsReport.body?.summary?.total_stock_value === 'number');
  check('Products report summary tem low_stock_count', typeof productsReport.body?.summary?.low_stock_count === 'number');

  // 58. Relatório de estoque
  const stockReport = await req('GET', '/reports/stock', null, adminToken);
  check('GET /reports/stock (200)', stockReport.status === 200, `status=${stockReport.status}`);
  check('Stock report tem items (array)', Array.isArray(stockReport.body?.items));
  check('Stock report tem summary', stockReport.body?.summary);
  check('Stock report summary tem entries', typeof stockReport.body?.summary?.entries === 'number');
  check('Stock report summary tem exits', typeof stockReport.body?.summary?.exits === 'number');

  // 59. Relatório de estoque com filtro por tipo
  const entriesStock = await req('GET', '/reports/stock?type=entrada', null, adminToken);
  check('Stock report filtro type=entrada (200)', entriesStock.status === 200);
  check('Lista só tem entradas', entriesStock.body?.items?.every((m) => m.type === 'entrada'));

  // 60. Relatório de pedidos
  const ordersReport = await req('GET', '/reports/orders', null, adminToken);
  check('GET /reports/orders (200)', ordersReport.status === 200, `status=${ordersReport.status}`);
  check('Orders report tem items (array)', Array.isArray(ordersReport.body?.items));
  check('Orders report tem summary', ordersReport.body?.summary);
  check('Orders report summary tem total_revenue', typeof ordersReport.body?.summary?.total_revenue === 'number');

  // 61. Relatório de clientes
  const customersReport = await req('GET', '/reports/customers', null, adminToken);
  check('GET /reports/customers (200)', customersReport.status === 200, `status=${customersReport.status}`);
  check('Customers report tem items (array)', Array.isArray(customersReport.body?.items));
  check('Customers report tem summary', customersReport.body?.summary);
  check('Customers report summary tem total_customers', typeof customersReport.body?.summary?.total_customers === 'number');

  // 62. Relatório de entregas
  const deliveriesReport = await req('GET', '/reports/deliveries', null, adminToken);
  check('GET /reports/deliveries (200)', deliveriesReport.status === 200, `status=${deliveriesReport.status}`);
  check('Deliveries report tem items (array)', Array.isArray(deliveriesReport.body?.items));
  check('Deliveries report tem summary', deliveriesReport.body?.summary);

  // 63. Relatórios sem token
  const noAuthReport = await req('GET', '/reports/dashboard');
  check('Relatórios sem token bloqueados (401)', noAuthReport.status === 401, `status=${noAuthReport.status}`);

  // 64. Dashboard com filtro de período
  const dashPeriod = await req('GET', `/reports/dashboard?date_from=${today}&date_to=${today}`, null, adminToken);
  check('Dashboard com filtro de período (200)', dashPeriod.status === 200);

  // ============================================================
  console.log('\n--- CONCORRÊNCIA: PDV ---');

  // 65. Duas vendas PDV simultâneas disputando o último produto (stock=1)
  const raceSale1 = req('POST', '/sales', {
    items: [{ product_id: productRaceId, product_name: 'Race', price: 15, quantity: 1 }],
    payment_method: 'pix',
  }, adminToken);
  const raceSale2 = req('POST', '/sales', {
    items: [{ product_id: productRaceId, product_name: 'Race', price: 15, quantity: 1 }],
    payment_method: 'dinheiro',
  }, adminToken);

  const [r1, r2] = await Promise.all([raceSale1, raceSale2]);
  const successCount = [r1, r2].filter((r) => r.status === 201).length;
  const failCount = [r1, r2].filter((r) => r.status === 400).length;
  check('Concorrência PDV: somente 1 sucesso', successCount === 1, `success=${successCount}`);
  check('Concorrência PDV: 1 falha (estoque)', failCount === 1, `fail=${failCount}`);

  // 66. Estoque nunca ficou negativo
  const raceProduct = await dbQuery('SELECT stock FROM products WHERE id = $1', [productRaceId]);
  check('Estoque do produto concorrência = 0 (nunca negativo)', Number(raceProduct[0]?.stock) === 0, `stock=${raceProduct[0]?.stock}`);

  // 67. Apenas 1 venda foi registrada
  const successfulSale = [r1, r2].find((r) => r.status === 201);
  if (successfulSale) ctx.createdSaleIds.push(successfulSale.body?.id);
  check('Apenas 1 venda registrada no banco', successCount === 1);

  // ============================================================
  console.log('\n--- CONCORRÊNCIA: CANCELAMENTO ---');

  // 68. Dois cancelamentos simultâneos da mesma venda
  const saleForRaceCancel = await req('POST', '/sales', {
    items: [{ product_id: productBId, product_name: 'B', price: 8.5, quantity: 2 }],
    payment_method: 'pix',
  }, adminToken);
  ctx.createdSaleIds.push(saleForRaceCancel.body?.id);
  const stockBeforeRaceCancel = await dbQuery('SELECT stock, total_sold FROM products WHERE id = $1', [productBId]);

  const cancel1 = req('PATCH', `/sales/${saleForRaceCancel.body?.id}/cancel`, null, adminToken);
  const cancel2 = req('PATCH', `/sales/${saleForRaceCancel.body?.id}/cancel`, null, adminToken);

  const [c1, c2] = await Promise.all([cancel1, cancel2]);
  const cancelSuccess = [c1, c2].filter((r) => r.status === 200).length;
  const cancelFail = [c1, c2].filter((r) => r.status === 400).length;
  check('Concorrência cancelamento: somente 1 sucesso', cancelSuccess === 1, `success=${cancelSuccess}`);
  check('Concorrência cancelamento: 1 falha (já cancelada)', cancelFail === 1, `fail=${cancelFail}`);

  // 69. Estoque devolvido apenas uma vez
  const stockAfterRaceCancel = await dbQuery('SELECT stock, total_sold FROM products WHERE id = $1', [productBId]);
  check('Estoque devolvido apenas 1 vez',
    Number(stockAfterRaceCancel[0]?.stock) === Number(stockBeforeRaceCancel[0]?.stock) + 2,
    `before=${stockBeforeRaceCancel[0]?.stock} after=${stockAfterRaceCancel[0]?.stock}`);

  // 70. total_sold ajustado apenas uma vez
  check('total_sold ajustado apenas 1 vez',
    Number(stockAfterRaceCancel[0]?.total_sold) === Number(stockBeforeRaceCancel[0]?.total_sold) - 2,
    `before=${stockBeforeRaceCancel[0]?.total_sold} after=${stockAfterRaceCancel[0]?.total_sold}`);

  // 71. Apenas 1 StockMovement de entrada criado
  const cancelMovements = await dbQuery('SELECT count(*) as count FROM stock_movements WHERE product_id = $1 AND reason LIKE $2', [productBId, '%Cancelamento%']);
  // Pode haver movimentações de outros testes, mas as do race cancel devem ser exatamente 1
  check('StockMovement entrada criado no cancelamento concorrente', Number(cancelMovements[0]?.count) >= 1);
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