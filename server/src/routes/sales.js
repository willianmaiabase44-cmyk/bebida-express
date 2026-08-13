import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/sales — listar vendas (PDV) — PENDENTE
router.get('/', notImplemented('Listar vendas PDV'));

// GET /api/sales/:id — buscar venda por ID — PENDENTE
router.get('/:id', notImplemented('Buscar venda por ID'));

// POST /api/sales — registrar venda no PDV — PENDENTE
router.post('/', notImplemented('Registrar venda PDV'));

// PATCH /api/sales/:id/cancel — cancelar venda — PENDENTE
router.patch('/:id/cancel', notImplemented('Cancelar venda'));

export default router;