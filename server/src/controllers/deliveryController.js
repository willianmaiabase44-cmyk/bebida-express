// ============================================================
// deliveryController.js — Handlers HTTP de entregas (Delivery)
// ============================================================

import { deliveryService } from '../services/deliveryService.js';

export function list(req, res, next) {
  deliveryService
    .list(req.query)
    .then((deliveries) => res.json(deliveries))
    .catch(next);
}

export function getById(req, res, next) {
  deliveryService
    .getById(req.params.id)
    .then((delivery) => res.json(delivery))
    .catch(next);
}

export function create(req, res, next) {
  deliveryService
    .create(req.body)
    .then((delivery) => res.status(201).json(delivery))
    .catch(next);
}

export function update(req, res, next) {
  deliveryService
    .update(req.params.id, req.body)
    .then((delivery) => res.json(delivery))
    .catch(next);
}

export function updateStatus(req, res, next) {
  deliveryService
    .updateStatus(req.params.id, req.body.status)
    .then((delivery) => res.json(delivery))
    .catch(next);
}

export function remove(req, res, next) {
  deliveryService
    .remove(req.params.id)
    .then((result) => res.json(result))
    .catch(next);
}