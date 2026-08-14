// ============================================================
// promotions.js — Rotas de promoções
// ============================================================
// GET    /api/promotions       — público (ativas e vigentes)
//                                admin com ?all=true (todas)
// GET    /api/promotions/:id   — público
// POST   /api/promotions       — admin
// PUT    /api/promotions/:id   — admin
// DELETE /api/promotions/:id   — admin
// ============================================================

import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as promotionController from '../controllers/promotionController.js';

const router = Router();

// Público: optionalAuth permite admin ver todas com ?all=true
router.get('/', optionalAuth, asyncHandler(promotionController.list));
router.get('/:id', optionalAuth, asyncHandler(promotionController.getById));

// Admin
router.post('/', authMiddleware, adminOnly, asyncHandler(promotionController.create));
router.put('/:id', authMiddleware, adminOnly, asyncHandler(promotionController.update));
router.delete('/:id', authMiddleware, adminOnly, asyncHandler(promotionController.remove));

export default router;