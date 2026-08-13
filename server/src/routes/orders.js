import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as orderController from '../controllers/orderController.js';

const router = Router();

// POST /api/orders — criar pedido (transação atômica) — IMPLEMENTADO
router.post('/', authMiddleware, asyncHandler(orderController.createOrder));

// GET /api/orders — listar pedidos (admin) — IMPLEMENTADO
router.get('/', authMiddleware, adminOnly, asyncHandler(orderController.listOrders));

// GET /api/orders/customer/:customerId — pedidos de um cliente — IMPLEMENTADO
// Deve vir ANTES de /:id para não conflitar
router.get('/customer/:customerId', authMiddleware, asyncHandler(orderController.getOrdersByCustomer));

// GET /api/orders/:id — buscar pedido por ID — IMPLEMENTADO
router.get('/:id', authMiddleware, asyncHandler(orderController.getOrderById));

// ============================================================
// Etapa 5 — Gestão de entrega e status
// ============================================================

// PATCH /api/orders/:id/status — alterar status (admin) — máquina de estados
router.patch('/:id/status', authMiddleware, adminOnly, asyncHandler(orderController.updateStatus));

// PATCH /api/orders/:id/assign-driver — designar motoboy (admin) — transação atômica
router.patch('/:id/assign-driver', authMiddleware, adminOnly, asyncHandler(orderController.assignDriver));

// PATCH /api/orders/:id/accept-delivery — aceitar entrega (motoboy) — transação atômica
router.patch('/:id/accept-delivery', authMiddleware, asyncHandler(orderController.acceptDelivery));

// PATCH /api/orders/:id/deliver — marcar entregue (motoboy) — transação atômica
router.patch('/:id/deliver', authMiddleware, asyncHandler(orderController.deliverOrder));

export default router;