import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { notImplemented } from '../middleware/notImplemented.js';
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
// Rotas abaixo permanecem não implementadas (próxima etapa)
// ============================================================
router.patch('/:id/status', notImplemented('Alterar status do pedido'));
router.post('/:id/assign', notImplemented('Designar motoboy'));
router.post('/:id/deliver', notImplemented('Marcar como entregue'));

export default router;