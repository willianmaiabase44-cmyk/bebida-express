// ============================================================
// promotionController.js — Handlers HTTP de promoções
// ============================================================
// GET público: lista ativas e vigentes.
// Admin: CRUD completo.
// ============================================================

import { promotionService } from '../services/promotionService.js';

// GET /api/promotions — público (ativas) ou admin (todas com ?all=true)
export function list(req, res, next) {
  const isAdmin = req.user?.role === 'admin';
  const showAll = isAdmin && req.query.all === 'true';

  const promise = showAll
    ? promotionService.listAll()
    : promotionService.listActive();

  promise.then((promotions) => res.json(promotions)).catch(next);
}

export function getById(req, res, next) {
  promotionService
    .getById(req.params.id)
    .then((promotion) => res.json(promotion))
    .catch(next);
}

export function create(req, res, next) {
  promotionService
    .create(req.body)
    .then((promotion) => res.status(201).json(promotion))
    .catch(next);
}

export function update(req, res, next) {
  promotionService
    .update(req.params.id, req.body)
    .then((promotion) => res.json(promotion))
    .catch(next);
}

export function remove(req, res, next) {
  promotionService
    .remove(req.params.id)
    .then((result) => res.json(result))
    .catch(next);
}