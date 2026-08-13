import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/reviews — listar avaliações (admin) — PENDENTE
router.get('/', notImplemented('Listar avaliações'));

// GET /api/reviews/:id — buscar avaliação por ID — PENDENTE
router.get('/:id', notImplemented('Buscar avaliação por ID'));

// POST /api/reviews — criar avaliação de entrega — PENDENTE
router.post('/', notImplemented('Criar avaliação'));

// PUT /api/reviews/:id — atualizar avaliação — PENDENTE
router.put('/:id', notImplemented('Atualizar avaliação'));

// DELETE /api/reviews/:id — excluir avaliação — PENDENTE
router.delete('/:id', notImplemented('Excluir avaliação'));

export default router;