import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/coupons — listar cupons (admin) — PENDENTE
router.get('/', notImplemented('Listar cupons'));

// GET /api/coupons/:id — buscar cupom por ID — PENDENTE
router.get('/:id', notImplemented('Buscar cupom por ID'));

// POST /api/coupons — criar cupom (admin) — PENDENTE
router.post('/', notImplemented('Criar cupom'));

// PUT /api/coupons/:id — atualizar cupom (admin) — PENDENTE
router.put('/:id', notImplemented('Atualizar cupom'));

// DELETE /api/coupons/:id — excluir cupom (admin) — PENDENTE
router.delete('/:id', notImplemented('Excluir cupom'));

// POST /api/coupons/validate — validar cupom (preview no checkout) — PENDENTE
router.post('/validate', notImplemented('Validar cupom'));

export default router;