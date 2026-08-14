// ============================================================
// saleController.js — Handlers HTTP de vendas PDV
// ============================================================

import { saleService } from '../services/saleService.js';

// POST /api/sales — registrar venda (transação atômica)
export function createSale(req, res, next) {
  saleService
    .createSale(req.body)
    .then((sale) => res.status(201).json(sale))
    .catch(next);
}

// GET /api/sales — listar vendas (admin)
export function listSales(req, res, next) {
  saleService
    .listSales(req.query)
    .then((sales) => res.json(sales))
    .catch(next);
}

// GET /api/sales/:id — buscar venda por ID (admin)
export function getSaleById(req, res, next) {
  saleService
    .getSaleById(req.params.id)
    .then((sale) => res.json(sale))
    .catch(next);
}

// PATCH /api/sales/:id/cancel — cancelar venda (admin, transação atômica)
export function cancelSale(req, res, next) {
  saleService
    .cancelSale(req.params.id)
    .then((result) => res.json(result))
    .catch(next);
}