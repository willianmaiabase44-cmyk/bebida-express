import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as motoboyController from '../controllers/motoboyController.js';

const router = Router();

// ============================================================
// CRUD de motoboys (admin only)
// ============================================================
router.get('/', authMiddleware, adminOnly, asyncHandler(motoboyController.list));
router.post('/', authMiddleware, adminOnly, asyncHandler(motoboyController.create));

// GET /api/motoboys/reviews — todas as avaliações agregadas (admin)
// Deve vir ANTES de /:id para não conflitar
router.get('/reviews', authMiddleware, adminOnly, asyncHandler(motoboyController.getAllReviews));

router.get('/:id', authMiddleware, adminOnly, asyncHandler(motoboyController.getById));
router.put('/:id', authMiddleware, adminOnly, asyncHandler(motoboyController.update));
router.delete('/:id', authMiddleware, adminOnly, asyncHandler(motoboyController.remove));

// ============================================================
// Pedidos e avaliações do motoboy (motoboy ou admin)
// ============================================================
router.get('/:id/orders', authMiddleware, asyncHandler(motoboyController.getOrders));
router.get('/:id/reviews', authMiddleware, asyncHandler(motoboyController.getReviews));

export default router;