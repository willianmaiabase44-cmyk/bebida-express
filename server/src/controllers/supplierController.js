// ============================================================
// supplierController.js — Handlers HTTP de fornecedores
// ============================================================

import { supplierService } from '../services/supplierService.js';

export function list(req, res, next) {
  supplierService
    .list(req.query)
    .then((suppliers) => res.json(suppliers))
    .catch(next);
}

export function getById(req, res, next) {
  supplierService
    .getById(req.params.id)
    .then((supplier) => res.json(supplier))
    .catch(next);
}

export function create(req, res, next) {
  supplierService
    .create(req.body)
    .then((supplier) => res.status(201).json(supplier))
    .catch(next);
}

export function update(req, res, next) {
  supplierService
    .update(req.params.id, req.body)
    .then((supplier) => res.json(supplier))
    .catch(next);
}

export function remove(req, res, next) {
  supplierService
    .remove(req.params.id)
    .then((result) => res.json(result))
    .catch(next);
}