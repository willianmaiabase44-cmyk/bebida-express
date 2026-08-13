import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/store-settings — buscar configurações da loja — PENDENTE
router.get('/', notImplemented('Buscar configurações da loja'));

// PUT /api/store-settings — atualizar configurações (admin) — PENDENTE
router.put('/', notImplemented('Atualizar configurações da loja'));

export default router;