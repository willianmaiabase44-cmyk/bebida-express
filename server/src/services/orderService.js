// ============================================================
// orderService.js — SERVIÇO DE PEDIDOS (TRANSAÇÃO ATÔMICA)
// ============================================================
// Criação de pedido dentro de UMA ÚNICA transação PostgreSQL:
//   1. SELECT ... FOR UPDATE nos produtos (lock de estoque)
//   2. Validar preços contra o banco (não confiar no frontend)
//   3. Verificar estoque disponível (com lock ativo)
//   4. Validar e aplicar cupom (SELECT ... FOR UPDATE no cupom)
//   5. Criar pedido (order_number via nextval('order_number_seq'))
//   6. Baixar estoque (UPDATE products SET stock = stock - qty)
//   7. Registrar StockMovement para cada baixa
//   8. Incrementar uso do cupom atomicamente
//
// Em caso de qualquer erro: ROLLBACK automático.
// ============================================================

import { withTransaction } from '../db/index.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { stockMovementRepository } from '../repositories/stockMovementRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { couponRepository } from '../repositories/couponRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { customerAddressRepository } from '../repositories/customerAddressRepository.js';
import { calculateFreight } from './freightService.js';
import { buildFullAddress } from '../utils/geo.js';
import { orderStatusService } from './orderStatusService.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const orderService = {
  // ============================================================
  // POST /api/orders — CRIAR PEDIDO (transação atômica)
  // ============================================================
  // idempotencyKey (opcional): se fornecido e já existir um pedido
  // com a mesma chave, retorna o pedido existente em vez de duplicar.
  // ============================================================
  async createOrder(data, currentUser, idempotencyKey) {
    const { items, address_id, customer_id, payment_method, change_for, notes, coupon_code } = data;

    // 0. Idempotência — se já existe pedido com esta chave, retorna ele
    if (idempotencyKey) {
      const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return {
          success: true,
          order_id: existing.id,
          order_number: existing.order_number,
          total: Number(existing.total),
          subtotal: Number(existing.subtotal),
          freight: Number(existing.freight),
          discount: Number(existing.discount),
          coupon_code: existing.coupon_code,
          distance_km: Number(existing.distance_km),
          idempotent_replay: true,
        };
      }
    }

    // 1. Validar campos obrigatórios
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw httpError('Carrinho vazio', 400);
    }
    if (!payment_method) throw httpError('Forma de pagamento obrigatória', 400);
    if (!customer_id) throw httpError('Cliente obrigatório', 400);
    if (!address_id) throw httpError('Endereço de entrega obrigatório', 400);

    // 2. Validar ownership — cliente só pode criar pedido para si mesmo
    if (currentUser.type === 'customer' && currentUser.id !== customer_id) {
      throw httpError('Você só pode criar pedidos para si mesmo', 403);
    }

    // 3. Buscar cliente no banco
    const customer = await customerRepository.findById(customer_id);
    if (!customer) throw httpError('Cliente não encontrado', 404);

    // 4. Validar ownership do endereço
    const address = await customerAddressRepository.findById(address_id);
    if (!address) throw httpError('Endereço não encontrado', 404);
    if (address.customer_id !== customer_id) {
      throw httpError('Endereço não pertence a este cliente', 403);
    }

    // 5. Calcular frete (fora da transação — leitura de settings/address)
    //    Não confia em distance_km ou freight do frontend
    const freightResult = await calculateFreight(address_id);

    // 6. TRANSAÇÃO ATÔMICA
    const result = await withTransaction(async (client) => {
      // 6a. Lock produtos FOR UPDATE (apenas produtos não-kit)
      const productIds = items
        .filter((i) => !i.is_kit && i.product_id)
        .map((i) => i.product_id);

      let products = [];
      if (productIds.length > 0) {
        const { rows } = await client.query(
          'SELECT * FROM products WHERE id = ANY($1) FOR UPDATE',
          [productIds]
        );
        products = rows;
      }

      // 6b. Validar produtos e calcular subtotal (preços do banco)
      const validatedItems = [];
      let subtotal = 0;
      const stockUpdates = [];

      for (const item of items) {
        if (item.is_kit) {
          // Kits: preservam preço do frontend, sem baixa de estoque
          const lineTotal = Number(item.price) * item.quantity;
          subtotal += lineTotal;
          validatedItems.push({
            product_id: item.product_id || '',
            product_name: item.product_name,
            price: Number(item.price),
            quantity: item.quantity,
            is_kit: true,
            kit_items: item.kit_items || '',
          });
          continue;
        }

        const product = products.find((p) => p.id === item.product_id);
        if (!product) {
          throw httpError(`Produto não encontrado: ${item.product_name || item.product_id}`, 400);
        }
        if (!product.active) {
          throw httpError(`Produto indisponível: ${product.name}`, 400);
        }
        if (!item.quantity || item.quantity <= 0) {
          throw httpError('Quantidade inválida', 400);
        }
        if (product.stock < item.quantity) {
          throw httpError(
            `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`,
            400
          );
        }

        const lineTotal = Number(product.price) * item.quantity;
        subtotal += lineTotal;
        validatedItems.push({
          product_id: product.id,
          product_name: product.name,
          price: Number(product.price),
          quantity: item.quantity,
          is_kit: false,
        });

        stockUpdates.push({
          id: product.id,
          product_name: product.name,
          quantity: item.quantity,
        });
      }

      subtotal = Math.round(subtotal * 100) / 100;

      // 6c. Aplicar frete grátis acima do threshold
      let freight = freightResult.freight;
      const freeThreshold = freightResult.free_freight_threshold || 0;
      if (freeThreshold > 0 && subtotal >= freeThreshold) {
        freight = 0;
      }

      // 6d. Validar e aplicar cupom (SELECT ... FOR UPDATE para evitar race)
      let discount = 0;
      let appliedCouponCode = '';
      let couponId = null;

      if (coupon_code) {
        const code = String(coupon_code).toUpperCase().trim();
        const { rows: couponRows } = await client.query(
          'SELECT * FROM coupons WHERE code = $1 FOR UPDATE',
          [code]
        );
        const coupon = couponRows[0];
        if (!coupon) throw httpError('Cupom não encontrado', 400);
        if (!coupon.active) throw httpError('Cupom inativo', 400);

        const today = new Date().toISOString().split('T')[0];
        const startDate = coupon.start_date
          ? new Date(coupon.start_date).toISOString().split('T')[0]
          : null;
        const endDate = coupon.end_date
          ? new Date(coupon.end_date).toISOString().split('T')[0]
          : null;
        if (startDate && today < startDate) {
          throw httpError('Cupom ainda não está disponível', 400);
        }
        if (endDate && today > endDate) {
          throw httpError('Cupom expirado', 400);
        }
        if (coupon.max_uses > 0 && (coupon.used_count || 0) >= coupon.max_uses) {
          throw httpError('Cupom esgotado', 400);
        }
        if (coupon.min_order_value > 0 && subtotal < Number(coupon.min_order_value)) {
          throw httpError(
            `Valor mínimo do pedido para este cupom: R$ ${Number(coupon.min_order_value).toFixed(2)}`,
            400
          );
        }
        if (coupon.per_customer_limit > 0) {
          const usedBy = Array.isArray(coupon.used_by) ? coupon.used_by : [];
          const customerUses = usedBy.filter((cid) => cid === customer_id).length;
          if (customerUses >= coupon.per_customer_limit) {
            throw httpError('Você já usou este cupom', 400);
          }
        }

        discount = Math.round(subtotal * Number(coupon.discount_percent)) / 100;
        appliedCouponCode = coupon.code;
        couponId = coupon.id;
      }

      // 6e. Calcular total
      const total = Math.round((subtotal - discount + freight) * 100) / 100;

      // 6f. Criar pedido (order_number via sequence atômica)
      const today = new Date().toISOString().split('T')[0];
      const statusHistory = [
        { status: 'novo', date: new Date().toISOString(), by: customer.phone },
      ];

      const order = await orderRepository.create(
        {
          customer_id: customer.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email || '',
          address_cep: address.cep,
          address_street: address.street,
          address_number: address.number,
          address_complement: address.complement,
          address_district: address.district,
          address_city: address.city,
          address_state: address.state,
          address_reference: address.reference,
          address_full: buildFullAddress(address),
          address_lat: freightResult.client_lat,
          address_lng: freightResult.client_lng,
          items: validatedItems,
          subtotal,
          distance_km: freightResult.distance_km,
          freight_per_km: freightResult.freight_per_km || null,
          freight,
          coupon_code: appliedCouponCode,
          discount,
          total,
          payment_method,
          change_for: change_for || null,
          status: 'novo',
          channel: 'online',
          notes: notes || '',
          status_history: statusHistory,
          date: today,
          idempotency_key: idempotencyKey || null,
        },
        client
      );

      // 6g. Baixar estoque + registrar StockMovement
      for (const su of stockUpdates) {
        const { rows: [updatedProduct] } = await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2 RETURNING *',
          [su.quantity, su.id]
        );

        await stockMovementRepository.create(
          {
            product_id: su.id,
            product_name: su.product_name,
            type: 'saida',
            quantity: su.quantity,
            date: today,
            reason: `Pedido online #${order.order_number}`,
            stock_after: updatedProduct.stock,
          },
          client
        );
      }

      // 6h. Consumir cupom atomicamente (used_count + 1, used_by || customer_id)
      if (couponId) {
        await client.query(
          `UPDATE coupons
             SET used_count = used_count + 1,
                 used_by = used_by || $2::jsonb
           WHERE id = $1`,
          [couponId, JSON.stringify([customer_id])]
        );
      }

      return { order };
    });

    // 7. Retornar resposta no formato esperado
    const order = result.order;
    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      freight: Number(order.freight),
      discount: Number(order.discount),
      coupon_code: order.coupon_code,
      distance_km: Number(order.distance_km),
    };
  },

  // ============================================================
  // GET /api/orders — LISTAR TODOS (admin)
  // ============================================================
  async listOrders({ status, limit, offset } = {}) {
    return orderRepository.findAll({ status, limit, offset });
  },

  // ============================================================
  // GET /api/orders/customer/:customerId — PEDIDOS DE UM CLIENTE
  // ============================================================
  async getOrdersByCustomer(customerId, currentUser) {
    if (currentUser.type === 'customer' && currentUser.id !== customerId) {
      throw httpError('Acesso negado', 403);
    }
    return orderRepository.findByCustomerId(customerId);
  },

  // ============================================================
  // GET /api/orders/:id — BUSCAR PEDIDO POR ID
  // ============================================================
  async getOrderById(id, currentUser) {
    const order = await orderRepository.findById(id);
    if (!order) throw httpError('Pedido não encontrado', 404);

    // Cliente só pode ver próprios pedidos
    if (currentUser.type === 'customer' && order.customer_id !== currentUser.id) {
      throw httpError('Acesso negado', 403);
    }
    // Motoboy só pode ver pedidos designados a ele
    if (currentUser.type === 'motoboy' && order.motoboy_id !== currentUser.id) {
      throw httpError('Acesso negado', 403);
    }
    return order;
  },

  // ============================================================
  // PATCH /api/orders/:id/assign-driver — ATRIBUIR MOTOBOY (admin)
  // Transação atômica: lock order + lock driver
  // ============================================================
  async assignDriver(orderId, motoboyId, currentUser) {
    if (currentUser.type !== 'admin') {
      throw httpError('Apenas administradores podem designar motoboys', 403);
    }
    if (!motoboyId) throw httpError('Motoboy é obrigatório', 400);

    return withTransaction(async (client) => {
      // 1. Lock pedido FOR UPDATE
      const { rows: orderRows } = await client.query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );
      const order = orderRows[0];
      if (!order) throw httpError('Pedido não encontrado', 404);

      // 2. Status válido para atribuição (pré-entrega)
      const validStatuses = ['novo', 'confirmado', 'em_preparacao', 'pronto'];
      if (!validStatuses.includes(order.status)) {
        throw httpError(`Pedido com status "${order.status}" não pode receber atribuição`, 400);
      }

      // 3. Lock motoboy FOR UPDATE
      const { rows: driverRows } = await client.query(
        'SELECT * FROM delivery_drivers WHERE id = $1 FOR UPDATE',
        [motoboyId]
      );
      const driver = driverRows[0];
      if (!driver) throw httpError('Motoboy não encontrado', 404);
      if (!driver.active) throw httpError('Motoboy inativo', 400);

      // 4. Atribuir motoboy SEM alterar status (preserva máquina de estados)
      //    O status para 'saiu_para_entrega' deve ser feito via updateStatus,
      //    que respeita as transições válidas (pronto → saiu_para_entrega).
      const now = new Date().toISOString();
      await client.query(
        `UPDATE orders
           SET motoboy_id = $2, motoboy_name = $3, motoboy_assigned_at = $4
         WHERE id = $1`,
        [orderId, driver.id, driver.name, now]
      );

      // 5. Motoboy → ocupado
      await client.query(
        'UPDATE delivery_drivers SET status = $2 WHERE id = $1',
        [driver.id, 'ocupado']
      );

      return { success: true, motoboy_name: driver.name };
    });
  },

  // ============================================================
  // PATCH /api/orders/:id/accept-delivery — ACEITAR ENTREGA (motoboy)
  // Transação atômica: lock order
  // ============================================================
  async acceptDelivery(orderId, currentUser) {
    if (currentUser.type !== 'motoboy') {
      throw httpError('Apenas motoboys podem aceitar entregas', 403);
    }

    return withTransaction(async (client) => {
      const { rows: orderRows } = await client.query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );
      const order = orderRows[0];
      if (!order) throw httpError('Pedido não encontrado', 404);

      // Motoboy A nunca aceita pedido do motoboy B
      if (order.motoboy_id !== currentUser.id) {
        throw httpError('Este pedido não foi designado para você', 403);
      }

      // Status deve ser pronto (aguardando aceite)
      if (order.status !== 'pronto') {
        throw httpError('Pedido não está aguardando aceite', 400);
      }

      const now = new Date().toISOString();
      const historyEntry = { status: 'saiu_para_entrega', date: now, by: 'motoboy' };

      await client.query(
        `UPDATE orders
           SET status = 'saiu_para_entrega', accepted_at = $2,
               status_history = status_history || $3::jsonb
         WHERE id = $1`,
        [orderId, now, JSON.stringify([historyEntry])]
      );

      // Motoboy → ocupado
      await client.query(
        'UPDATE delivery_drivers SET status = $2 WHERE id = $1',
        [order.motoboy_id, 'ocupado']
      );

      return { success: true };
    });
  },

  // ============================================================
  // PATCH /api/orders/:id/deliver — MARCAR ENTREGUE (motoboy)
  // Transação atômica: lock order + atomic increment
  // ============================================================
  async deliverOrder(orderId, currentUser) {
    if (currentUser.type !== 'motoboy') {
      throw httpError('Apenas motoboys podem marcar entregas', 403);
    }

    return withTransaction(async (client) => {
      const { rows: orderRows } = await client.query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );
      const order = orderRows[0];
      if (!order) throw httpError('Pedido não encontrado', 404);

      if (order.motoboy_id !== currentUser.id) {
        throw httpError('Este pedido não foi designado para você', 403);
      }

      if (order.status !== 'saiu_para_entrega') {
        throw httpError('Pedido não está em rota de entrega', 400);
      }

      const now = new Date().toISOString();
      const historyEntry = { status: 'entregue', date: now, by: 'motoboy' };

      await client.query(
        `UPDATE orders
           SET status = 'entregue', delivered_at = $2,
               status_history = status_history || $3::jsonb
         WHERE id = $1`,
        [orderId, now, JSON.stringify([historyEntry])]
      );

      // Incremento atômico + status disponível
      await client.query(
        `UPDATE delivery_drivers
           SET status = 'disponivel', total_deliveries = total_deliveries + 1
         WHERE id = $1`,
        [order.motoboy_id]
      );

      return { success: true };
    });
  },

  // ============================================================
  // PATCH /api/orders/:id/status — ALTERAR STATUS (admin)
  // Máquina de estados centralizada em orderStatusService
  // ============================================================
  async updateStatus(orderId, newStatus, currentUser) {
    if (currentUser.type !== 'admin') {
      throw httpError('Apenas administradores podem alterar status', 403);
    }
    if (!orderStatusService.isValidStatus(newStatus)) {
      throw httpError('Status inválido', 400);
    }

    return withTransaction(async (client) => {
      const { rows: orderRows } = await client.query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );
      const order = orderRows[0];
      if (!order) throw httpError('Pedido não encontrado', 404);

      if (!orderStatusService.canTransition(order.status, newStatus)) {
        throw httpError(`Transição inválida: ${order.status} → ${newStatus}`, 400);
      }

      const now = new Date().toISOString();
      const by = currentUser.type === 'admin' ? 'admin' : currentUser.name || 'sistema';
      const historyEntry = { status: newStatus, date: now, by };

      await client.query(
        `UPDATE orders
           SET status = $2, status_history = status_history || $3::jsonb
         WHERE id = $1`,
        [orderId, newStatus, JSON.stringify([historyEntry])]
      );

      // Cancelamento: devolver estoque dos itens não-kit e decrementar total_sold
      if (newStatus === 'cancelado' && order.status !== 'cancelado') {
        const items = Array.isArray(order.items) ? order.items : [];
        const today = new Date().toISOString().split('T')[0];

        for (const item of items) {
          if (item.is_kit || !item.product_id) continue;

          const { rows: [updatedProduct] } = await client.query(
            'UPDATE products SET stock = stock + $1, total_sold = total_sold - $1 WHERE id = $2 RETURNING *',
            [item.quantity, item.product_id]
          );

          await stockMovementRepository.create(
            {
              product_id: item.product_id,
              product_name: item.product_name,
              type: 'entrada',
              quantity: item.quantity,
              date: today,
              reason: `Cancelamento pedido #${order.order_number}`,
              stock_after: updatedProduct ? updatedProduct.stock : null,
            },
            client
          );
        }
      }

      return { success: true, status: newStatus };
    });
  },
};