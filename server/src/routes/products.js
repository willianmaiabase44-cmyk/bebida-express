import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/products — listar produtos (catálogo público)
router.get('/', notImplemented('Listar produtos'));

// GET /api/products/:id — buscar produto por ID
router.get('/:id', notImplemented('Buscar produto por ID'));

// POST /api/products — criar produto (admin) — PENDENTE
router.post('/', notImplemented('Criar produto'));

// PUT /api/products/:id — atualizar produto (admin) — PENDENTE
router.put('/:id', notImplemented('Atualizar produto'));

// DELETE /api/products/:id — excluir produto (admin) — PENDENTE
router.delete('/:id', notImplemented('Excluir produto'));

export default router;