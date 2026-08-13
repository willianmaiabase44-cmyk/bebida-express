import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/suppliers — listar fornecedores (admin) — PENDENTE
router.get('/', notImplemented('Listar fornecedores'));

// GET /api/suppliers/:id — buscar fornecedor por ID — PENDENTE
router.get('/:id', notImplemented('Buscar fornecedor por ID'));

// POST /api/suppliers — criar fornecedor (admin) — PENDENTE
router.post('/', notImplemented('Criar fornecedor'));

// PUT /api/suppliers/:id — atualizar fornecedor (admin) — PENDENTE
router.put('/:id', notImplemented('Atualizar fornecedor'));

// DELETE /api/suppliers/:id — excluir fornecedor (admin) — PENDENTE
router.delete('/:id', notImplemented('Excluir fornecedor'));

export default router;