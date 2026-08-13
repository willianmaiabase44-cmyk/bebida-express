// ============================================================
// routes/addresses.js — CRUD de endereços com ownership
// ============================================================
// Cliente autenticado só acessa seus próprios endereços.
// Admin autenticado acessa qualquer endereço.
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  listByCustomer,
  create,
  update,
  remove,
} from '../controllers/customerAddressController.js';

const router = Router();

// Todas as rotas de endereços requerem autenticação
router.use(authMiddleware);

router.get('/:customerId', listByCustomer);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;