import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/customers — listar clientes (admin) — PENDENTE
router.get('/', notImplemented('Listar clientes'));

// GET /api/customers/:id — buscar cliente por ID — PENDENTE
router.get('/:id', notImplemented('Buscar cliente por ID'));

// POST /api/customers — criar cliente — PENDENTE
router.post('/', notImplemented('Criar cliente'));

// PUT /api/customers/:id — atualizar cliente — PENDENTE
router.put('/:id', notImplemented('Atualizar cliente'));

// DELETE /api/customers/:id — excluir cliente (admin) — PENDENTE
router.delete('/:id', notImplemented('Excluir cliente'));

export default router;