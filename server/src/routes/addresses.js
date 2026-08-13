import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

// GET /api/addresses/:customerId — listar endereços do cliente — PENDENTE
router.get('/:customerId', notImplemented('Listar endereços do cliente'));

// POST /api/addresses — criar endereço — PENDENTE
router.post('/', notImplemented('Criar endereço'));

// PUT /api/addresses/:id — atualizar endereço — PENDENTE
router.put('/:id', notImplemented('Atualizar endereço'));

// DELETE /api/addresses/:id — excluir endereço — PENDENTE
router.delete('/:id', notImplemented('Excluir endereço'));

export default router;