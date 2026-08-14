// ============================================================
// reportController.js — Handlers HTTP de relatórios
// ============================================================
// Todos admin-only. Filtros via query params.
// ============================================================

import { reportService } from '../services/reportService.js';

export function dashboard(req, res, next) {
  reportService
    .dashboard(req.query)
    .then((data) => res.json(data))
    .catch(next);
}

export function sales(req, res, next) {
  reportService
    .salesReport(req.query)
    .then((data) => res.json(data))
    .catch(next);
}

export function products(req, res, next) {
  reportService
    .productsReport()
    .then((data) => res.json(data))
    .catch(next);
}

export function stock(req, res, next) {
  reportService
    .stockReport(req.query)
    .then((data) => res.json(data))
    .catch(next);
}

export function orders(req, res, next) {
  reportService
    .ordersReport(req.query)
    .then((data) => res.json(data))
    .catch(next);
}

export function customers(req, res, next) {
  reportService
    .customersReport()
    .then((data) => res.json(data))
    .catch(next);
}

export function deliveries(req, res, next) {
  reportService
    .deliveriesReport(req.query)
    .then((data) => res.json(data))
    .catch(next);
}