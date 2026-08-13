import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as reviewController from '../controllers/reviewController.js';

const router = Router();

// GET /api/reviews — listar avaliações (admin)
router.get('/', authMiddleware, adminOnly, asyncHandler(reviewController.list));

// GET /api/reviews/:id — buscar avaliação por ID (admin)
router.get('/:id', authMiddleware, adminOnly, asyncHandler(reviewController.getById));

// POST /api/reviews — criar avaliação (cliente autenticado)
router.post('/', authMiddleware, asyncHandler(reviewController.create));

export default router;