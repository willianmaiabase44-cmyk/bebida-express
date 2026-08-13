// ============================================================
// products.js — Rotas de produtos
// ============================================================
// GET    /api/products        — público (só active=true por padrão)
// GET    /api/products/:id    — público
// POST   /api/products        — admin
// PUT    /api/products/:id    — admin
// DELETE /api/products/:id    — admin
// ============================================================

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import * as productController from '../controllers/productController.js';

const router = Router();

// Público (optionalAuth permite admin ver inativos com include_inactive=true)
router.get('/', optionalAuth, asyncHandler(productController.list));
router.get('/:id', optionalAuth, asyncHandler(productController.getById));

// Admin
router.post('/', authMiddleware, adminOnly, asyncHandler(productController.create));
router.put('/:id', authMiddleware, adminOnly, asyncHandler(productController.update));
router.delete('/:id', authMiddleware, adminOnly, asyncHandler(productController.remove));

export default router;