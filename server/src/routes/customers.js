// ============================================================
// routes/customers.js — CRUD de clientes (admin)
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { list, getById, create, update, remove } from '../controllers/customerController.js';

const router = Router();

// Todas as rotas de clientes são admin-only
router.use(authMiddleware, adminOnly);

router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;