// ============================================================
// reports.js — Rotas de relatórios gerenciais (admin)
// ============================================================
// GET /api/reports/dashboard
// GET /api/reports/sales
// GET /api/reports/products
// GET /api/reports/stock
// GET /api/reports/orders
// GET /api/reports/customers
// GET /api/reports/deliveries
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();

router.get('/dashboard', authMiddleware, adminOnly, asyncHandler(reportController.dashboard));
router.get('/sales', authMiddleware, adminOnly, asyncHandler(reportController.sales));
router.get('/products', authMiddleware, adminOnly, asyncHandler(reportController.products));
router.get('/stock', authMiddleware, adminOnly, asyncHandler(reportController.stock));
router.get('/orders', authMiddleware, adminOnly, asyncHandler(reportController.orders));
router.get('/customers', authMiddleware, adminOnly, asyncHandler(reportController.customers));
router.get('/deliveries', authMiddleware, adminOnly, asyncHandler(reportController.deliveries));

export default router;