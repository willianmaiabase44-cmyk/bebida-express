// ============================================================
// orderController.js — Handlers HTTP de pedidos
// ============================================================
// Controllers são finos: extraem dados da req, chamam services,
// formatam a res. Regras de negócio ficam nos services.
// ============================================================

import { orderService } from '../services/orderService.js';

// POST /api/orders — criar pedido (transação atômica)
export function createOrder(req, res, next) {
  orderService
    .createOrder(req.body, req.user)
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