// ============================================================
// customerController.js — Handlers HTTP de clientes (admin)
// ============================================================

import { customerService } from '../services/customerService.js';

export function list(req, res, next) {
  customerService
    .list({ search: req.query.search })
    .then((customers) => res.json(customers))
    .catch(next);
}

export function getById(req, res, next) {
  customerService
    .getById(req.params.id)
    .then((customer) => res.json(customer))
    .catch(next);
}

export function create(req, res, next) {
  customerService
    .create(req.body)
    .then((customer) => res.status(201).json(customer))
    .catch(next);
}

export function update(req, res, next) {
  customerService
    .update(req.params.id, req.body)
    .then((customer) => res.json(customer))
    .catch(next);
}

export function remove(req, res, next) {
  customerService
    .remove(req.params.id)
    .then((result) => res.json(result))
    .catch(next);
}