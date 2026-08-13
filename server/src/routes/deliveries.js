import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as deliveryController from '../controllers/deliveryController.js';

const router = Router();

// CRUD de entregas (admin only)
router.get('/', authMiddleware, adminOnly, asyncHandler(deliveryController.list));
router.post('/', authMiddleware, adminOnly, asyncHandler(deliveryController.create));
router.get('/:id', authMiddleware, adminOnly, asyncHandler(deliveryController.getById));
router.put('/:id', authMiddleware, adminOnly, asyncHandler(deliveryController.update));
router.patch('/:id/status', authMiddleware, adminOnly, asyncHandler(deliveryController.updateStatus));
router.delete('/:id', authMiddleware, adminOnly, asyncHandler(deliveryController.remove));

export default router;