// ============================================================
// routes/freight.js — Cálculo de frete e rota
// ============================================================
// /calculate é público (clientes no checkout não têm auth).
// /route requer auth (motoboy/admin visualiza rota).
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { calculate, route } from '../controllers/freightController.js';

const router = Router();

// POST /api/freight/calculate — público
router.post('/calculate', calculate);

// POST /api/freight/route — requer auth
router.post('/route', authMiddleware, route);

export default router;