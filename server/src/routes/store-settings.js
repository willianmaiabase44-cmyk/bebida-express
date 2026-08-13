// ============================================================
// routes/store-settings.js — Configurações da loja (singleton)
// ============================================================
// GET é público. PUT é admin.
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { getSettings, updateSettings } from '../controllers/storeSettingsController.js';

const router = Router();

// GET público
router.get('/', getSettings);

// PUT admin
router.put('/', authMiddleware, adminOnly, updateSettings);

export default router;