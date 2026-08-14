// ============================================================
// sales.js — Rotas de vendas PDV
// ============================================================
// GET    /api/sales          — admin
// GET    /api/sales/:id      — admin
// POST   /api/sales          — admin (transação atômica)
// PATCH  /api/sales/:id/cancel — admin (transação atômica)
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as saleController from '../controllers/saleController.js';

const router = Router();

router.get('/', authMiddleware, adminOnly, asyncHandler(saleController.listSales));
router.get('/:id', authMiddleware, adminOnly, asyncHandler(saleController.getSaleById));
router.post('/', authMiddleware, adminOnly, asyncHandler(saleController.createSale));
router.patch('/:id/cancel', authMiddleware, adminOnly, asyncHandler(saleController.cancelSale));

export default router;