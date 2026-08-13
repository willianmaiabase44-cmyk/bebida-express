// ============================================================
// auth.js — Rotas de autenticação
// ============================================================
// POST /api/auth/admin/login  — login admin (email + senha, bcrypt, JWT)
// POST /api/auth/customer     — login/cadastro cliente por celular
// POST /api/auth/motoboy      — login motoboy (login + senha, bcrypt, JWT)
// GET  /api/auth/me           — usuário atual autenticado
// POST /api/auth/logout       — logout (cliente descarta token)
// ============================================================

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/admin/login', asyncHandler(authController.loginAdmin));
router.post('/customer', asyncHandler(authController.loginCustomer));
router.post('/motoboy', asyncHandler(authController.loginMotoboy));
router.get('/me', authMiddleware, asyncHandler(authController.getMe));
router.post('/logout', asyncHandler(authController.logout));

export default router;