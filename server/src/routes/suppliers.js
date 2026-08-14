// ============================================================
// suppliers.js — Rotas de fornecedores (admin)
// ============================================================
// GET    /api/suppliers       — admin
// GET    /api/suppliers/:id   — admin
// POST   /api/suppliers       — admin
// PUT    /api/suppliers/:id   — admin
// DELETE /api/suppliers/:id   — admin
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as supplierController from '../controllers/supplierController.js';

const router = Router();

router.get('/', authMiddleware, adminOnly, asyncHandler(supplierController.list));
router.get('/:id', authMiddleware, adminOnly, asyncHandler(supplierController.getById));
router.post('/', authMiddleware, adminOnly, asyncHandler(supplierController.create));
router.put('/:id', authMiddleware, adminOnly, asyncHandler(supplierController.update));
router.delete('/:id', authMiddleware, adminOnly, asyncHandler(supplierController.remove));

export default router;