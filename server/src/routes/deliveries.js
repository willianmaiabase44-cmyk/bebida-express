import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/deliveries — listar entregas (admin) — PENDENTE
router.get('/', notImplemented('Listar entregas'));

// GET /api/deliveries/:id — buscar entrega por ID — PENDENTE
router.get('/:id', notImplemented('Buscar entrega por ID'));

// POST /api/deliveries — criar entrega — PENDENTE
router.post('/', notImplemented('Criar entrega'));

// PUT /api/deliveries/:id — atualizar entrega — PENDENTE
router.put('/:id', notImplemented('Atualizar entrega'));

// PATCH /api/deliveries/:id/status — alterar status da entrega — PENDENTE
router.patch('/:id/status', notImplemented('Alterar status da entrega'));

// DELETE /api/deliveries/:id — excluir entrega — PENDENTE
router.delete('/:id', notImplemented('Excluir entrega'));

export default router;