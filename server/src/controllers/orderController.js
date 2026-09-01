// ============================================================
// orderController.js — Handlers HTTP de pedidos
// ============================================================
// Controllers são finos: extraem dados da req, chamam services,
// formatam a res. Regras de negócio ficam nos services.
// ============================================================

import { orderService } from '../services/orderService.js';

// POST /api/orders — criar pedido (transação atômica)
// Header opcional: Idempotency-Key — evita pedidos duplicados
export function createOrder(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'] || null;
  orderService
    .createOrder(req.body, req.user, idempotencyKey)
    .then((result) => res.status(201).json(result))
    .catch(next);
}

// GET /api/orders — listar pedidos (admin)
export function listOrders(req, res, next) {
  orderService
    .listOrders(req.query)
    .then((orders) => res.json(orders))
    .catch(next);
}

// GET /api/orders/customer/:customerId — pedidos de um cliente
export function getOrdersByCustomer(req, res, next) {
  orderService
    .getOrdersByCustomer(req.params.customerId, req.user)
    .then((orders) => res.json(orders))
    .catch(next);
}

// GET /api/orders/:id — buscar pedido por ID
export function getOrderById(req, res, next) {
  orderService
    .getOrderById(req.params.id, req.user)
    .then((order) => res.json(order))
    .catch(next);
}

// PATCH /api/orders/:id/assign-driver — designar motoboy (admin)
export function assignDriver(req, res, next) {
  orderService
    .assignDriver(req.params.id, req.body.motoboy_id, req.user)
    .then((result) => res.json(result))
    .catch(next);
}

// PATCH /api/orders/:id/accept-delivery — aceitar entrega (motoboy)
export function acceptDelivery(req, res, next) {
  orderService
    .acceptDelivery(req.params.id, req.user)
    .then((result) => res.json(result))
    .catch(next);
}

// PATCH /api/orders/:id/deliver — marcar entregue (motoboy)
export function deliverOrder(req, res, next) {
  orderService
    .deliverOrder(req.params.id, req.user)
    .then((result) => res.json(result))
    .catch(next);
}

// PATCH /api/orders/:id/status — alterar status (admin)
export function updateStatus(req, res, next) {
  orderService
    .updateStatus(req.params.id, req.body.status, req.user)
    .then((result) => res.json(result))
    .catch(next);
}