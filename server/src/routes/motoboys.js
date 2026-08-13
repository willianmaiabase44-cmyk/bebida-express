import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/motoboys — listar motoboys (admin) — PENDENTE
router.get('/', notImplemented('Listar motoboys'));

// GET /api/motoboys/:id — buscar motoboy por ID — PENDENTE
router.get('/:id', notImplemented('Buscar motoboy por ID'));

// POST /api/motoboys — criar motoboy (admin) — PENDENTE
router.post('/', notImplemented('Criar motoboy'));

// PUT /api/motoboys/:id — atualizar motoboy (admin) — PENDENTE
router.put('/:id', notImplemented('Atualizar motoboy'));

// DELETE /api/motoboys/:id — excluir motoboy (admin) — PENDENTE
router.delete('/:id', notImplemented('Excluir motoboy'));

// GET /api/motoboys/:id/orders — pedidos do motoboy — PENDENTE
router.get('/:id/orders', notImplemented('Pedidos do motoboy'));

// GET /api/motoboys/:id/reviews — avaliações do motoboy — PENDENTE
router.get('/:id/reviews', notImplemented('Avaliações do motoboy'));

export default router;