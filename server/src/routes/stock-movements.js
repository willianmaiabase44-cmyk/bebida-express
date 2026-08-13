import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/stock-movements — listar movimentações de estoque — PENDENTE
router.get('/', notImplemented('Listar movimentações de estoque'));

// GET /api/stock-movements/:id — buscar movimentação por ID — PENDENTE
router.get('/:id', notImplemented('Buscar movimentação por ID'));

// POST /api/stock-movements — registrar movimentação (entrada/saída) — PENDENTE
router.post('/', notImplemented('Registrar movimentação de estoque'));

export default router;