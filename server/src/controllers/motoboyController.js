// ============================================================
// motoboyController.js — Handlers HTTP de motoboys
// ============================================================

import { motoboyService } from '../services/motoboyService.js';

export function list(req, res, next) {
  motoboyService
    .list(req.query)
    .then((drivers) => res.json(drivers))
    .catch(next);
}

export function getById(req, res, next) {
  motoboyService
    .getById(req.params.id)
    .then((driver) => res.json(driver))
    .catch(next);
}

export function create(req, res, next) {
  motoboyService
    .create(req.body)
    .then((driver) => res.status(201).json(driver))
    .catch(next);
}

export function update(req, res, next) {
  motoboyService
    .update(req.params.id, req.body)
    .then((driver) => res.json(driver))
    .catch(next);
}

export function remove(req, res, next) {
  motoboyService
    .remove(req.params.id)
    .then((result) => res.json(result))
    .catch(next);
}

export function getOrders(req, res, next) {
  motoboyService
    .getMotoboyOrders(req.params.id, req.query.type, req.user)
    .then((orders) => res.json(orders))
    .catch(next);
}

export function getReviews(req, res, next) {
  motoboyService
    .getMotoboyReviews(req.params.id, req.user)
    .then((reviews) => res.json(reviews))
    .catch(next);
}

export function getAllReviews(req, res, next) {
  motoboyService
    .getAllMotoboyReviews()
    .then((result) => res.json({ motoboys: result }))
    .catch(next);
}