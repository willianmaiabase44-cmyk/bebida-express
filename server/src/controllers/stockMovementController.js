// ============================================================
// stockMovementController.js — Handlers HTTP de movimentações
// ============================================================

import { stockMovementService } from '../services/stockMovementService.js';

// GET /api/stock-movements — listar (admin)
export function list(req, res, next) {
  stockMovementService
    .listMovements(req.query)
    .then((movements) => res.json(movements))
    .catch(next);
}

// GET /api/stock-movements/:id — buscar por ID (admin)
export function getById(req, res, next) {
  stockMovementService
    .getMovementById(req.params.id)
    .then((movement) => res.json(movement))
    .catch(next);
}

// POST /api/stock-movements — registrar movimentação (admin, transação)
export function create(req, res, next) {
  stockMovementService
    .createMovement(req.body)
    .then((movement) => res.status(201).json(movement))
    .catch(next);
}