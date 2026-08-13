import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/promotions — listar promoções — PENDENTE
router.get('/', notImplemented('Listar promoções'));

// GET /api/promotions/:id — buscar promoção por ID — PENDENTE
router.get('/:id', notImplemented('Buscar promoção por ID'));

// POST /api/promotions — criar promoção (admin) — PENDENTE
router.post('/', notImplemented('Criar promoção'));

// PUT /api/promotions/:id — atualizar promoção (admin) — PENDENTE
router.put('/:id', notImplemented('Atualizar promoção'));

// DELETE /api/promotions/:id — excluir promoção (admin) — PENDENTE
router.delete('/:id', notImplemented('Excluir promoção'));

export default router;