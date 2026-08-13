import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// POST /api/orders — criar pedido (transação atômica) — PENDENTE
// Futuramente: placeOrder dentro de withTransaction()
router.post('/', notImplemented('Criar pedido (transação atômica)'));

// GET /api/orders — listar pedidos (admin) — PENDENTE
router.get('/', notImplemented('Listar pedidos'));

// GET /api/orders/:id — buscar pedido por ID — PENDENTE
router.get('/:id', notImplemented('Buscar pedido por ID'));

// GET /api/orders/customer/:customerId — pedidos de um cliente — PENDENTE
router.get('/customer/:customerId', notImplemented('Pedidos do cliente'));

// PATCH /api/orders/:id/status — alterar status (admin/motoboy) — PENDENTE
router.patch('/:id/status', notImplemented('Alterar status do pedido'));

// POST /api/orders/:id/assign — designar motoboy (admin) — PENDENTE
router.post('/:id/assign', notImplemented('Designar motoboy'));

// POST /api/orders/:id/deliver — marcar como entregue (motoboy) — PENDENTE
router.post('/:id/deliver', notImplemented('Marcar como entregue'));

export default router;