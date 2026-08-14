// ============================================================
// stock-movements.js — Rotas de movimentações de estoque
// ============================================================
// GET  /api/stock-movements      — admin (filtros: product_id, type, date_from, date_to)
// GET  /api/stock-movements/:id  — admin
// POST /api/stock-movements      — admin (transação atômica)
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as stockMovementController from '../controllers/stockMovementController.js';

const router = Router();

router.get('/', authMiddleware, adminOnly, asyncHandler(stockMovementController.list));
router.get('/:id', authMiddleware, adminOnly, asyncHandler(stockMovementController.getById));
router.post('/', authMiddleware, adminOnly, asyncHandler(stockMovementController.create));

export default router;