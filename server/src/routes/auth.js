import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// POST /api/auth/admin/login — login admin (email + senha, bcrypt, JWT) — PENDENTE
router.post('/admin/login', notImplemented('Login admin'));

// POST /api/auth/admin/register — cadastro admin — PENDENTE
router.post('/admin/register', notImplemented('Cadastro admin'));

// POST /api/auth/customer — login/cadastro cliente por celular — PENDENTE
router.post('/customer', notImplemented('Login cliente por celular'));

// POST /api/auth/motoboy — login motoboy (login + senha, bcrypt, JWT) — PENDENTE
router.post('/motoboy', notImplemented('Login motoboy'));

// GET /api/auth/me — usuário atual autenticado — PENDENTE
router.get('/me', notImplemented('Usuário atual'));

// POST /api/auth/logout — logout (invalidar token no cliente) — PENDENTE
router.post('/logout', notImplemented('Logout'));

export default router;