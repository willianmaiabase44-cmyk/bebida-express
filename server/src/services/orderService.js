// ============================================================
// orderService.js — SERVIÇO DE PEDIDOS
// ============================================================
// ARQUITETURA DE TRANSAÇÃO ATÔMICA (a implementar na Etapa 2)
//
// A criação de pedidos deverá executar dentro de withTransaction():
//
//   const result = await withTransaction(async (client) => {
//     // 1. SELECT ... FOR UPDATE nos produtos (lock de estoque)
//     const { rows: products } = await client.query(
//       'SELECT id, name, price, stock, active FROM products WHERE id = ANY($1) FOR UPDATE',
//       [productIds]
//     );
//
//     // 2. Validar preços contra o banco (não confiar no frontend)
//
//     // 3. Verificar estoque disponível (com lock ativo)
//
//     // 4. Validar e aplicar cupom (SELECT ... FOR UPDATE no cupom)
//     //    - verificar active, datas, max_uses, per_customer_limit, min_order_value
//     //    - calcular desconto
//
//     // 5. Criar pedido (order_number via nextval('order_number_seq'))
//     const { rows: [order] } = await client.query(
//       `INSERT INTO orders (order_number, customer_name, ...) VALUES (nextval('order_number_seq'), ...) RETURNING *`,
//       [...]
//     );
//
//     // 6. Baixar estoque (UPDATE com lock já ativo)
//     //    UPDATE products SET stock = stock - $1 WHERE id = $2
//
//     // 7. Registrar StockMovement
//     //    INSERT INTO stock_movements (product_id, type, quantity, ...)
//
//     // 8. Incrementar uso do cupom
//     //    UPDATE coupons SET used_count = used_count + 1, used_by = used_by || $1 WHERE id = $2
//
//     return { orderId: order.id, orderNumber: order.order_number };
//   });
//
// Em caso de qualquer erro: ROLLBACK automático (estoque não baixa, cupom não incrementa).
// ============================================================

import { withTransaction } from '../db/index.js';

// STATUS: PENDENTE — Etapa 2
export async function placeOrder(orderData) {
  throw new Error('placeOrder ainda não implementado — Etapa 2');
}

// STATUS: PENDENTE — Etapa 2
export async function getOrdersByCustomer(customerId) {
  throw new Error('getOrdersByCustomer ainda não implementado — Etapa 2');
}

// STATUS: PENDENTE — Etapa 2
export async function assignMotoboy(orderId, motoboyId) {
  throw new Error('assignMotoboy ainda não implementado — Etapa 2');
}

// STATUS: PENDENTE — Etapa 2
export async function markAsDelivered(orderId, motoboyId) {
  throw new Error('markAsDelivered ainda não implementado — Etapa 2');
}