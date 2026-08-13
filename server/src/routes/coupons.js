// ============================================================
// routes/coupons.js — CRUD de cupons + validação
// ============================================================
// CRUD é admin. /validate é público (preview no checkout).
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import {
  list,
  getById,
  create,
  update,
  remove,
  validate,
} from '../controllers/couponController.js';

const router = Router();

// POST /api/coupons/validate — público (deve vir ANTES de /:id)
router.post('/validate', validate);

// CRUD — admin
router.get('/', authMiddleware, adminOnly, list);
router.get('/:id', authMiddleware, adminOnly, getById);
router.post('/', authMiddleware, adminOnly, create);
router.put('/:id', authMiddleware, adminOnly, update);
router.delete('/:id', authMiddleware, adminOnly, remove);

export default router;