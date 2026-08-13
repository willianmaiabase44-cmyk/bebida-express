import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// POST /api/freight/calculate — calcular frete (geocodificação + rota + tabela) — PENDENTE
router.post('/calculate', notImplemented('Calcular frete'));

// POST /api/freight/route — calcular rota de entrega — PENDENTE
router.post('/route', notImplemented('Calcular rota de entrega'));

export default router;