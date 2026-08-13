// ============================================================
// customerAddressController.js — Handlers HTTP de endereços
// ============================================================
// Ownership: cliente só acessa seus próprios; admin acessa qualquer.
// ============================================================

import { customerAddressService } from '../services/customerAddressService.js';

// GET /api/addresses/:customerId
export function listByCustomer(req, res, next) {
  customerAddressService
    .listByCustomer(req.params.customerId, req.user)
    .then((addresses) => res.json(addresses))
    .catch(next);
}

// POST /api/addresses
export function create(req, res, next) {
  customerAddressService
    .create(req.body, req.user)
    .then((address) => res.status(201).json(address))
    .catch(next);
}

// PUT /api/addresses/:id
export function update(req, res, next) {
  customerAddressService
    .update(req.params.id, req.body, req.user)
    .then((address) => res.json(address))
    .catch(next);
}

// DELETE /api/addresses/:id
export function remove(req, res, next) {
  customerAddressService
    .remove(req.params.id, req.user)
    .then((result) => res.json(result))
    .catch(next);
}