// ============================================================
// freightController.js — Handlers HTTP de frete e rotas
// ============================================================

import { calculateFreight, calculateRouteInfo } from '../services/freightService.js';

// POST /api/freight/calculate — público (não requer auth)
export function calculate(req, res, next) {
  const { address_id, address } = req.body || {};
  calculateFreight(address_id, address)
    .then((result) => res.json(result))
    .catch(next);
}

// POST /api/freight/route — requer auth (qualquer tipo)
export function route(req, res, next) {
  const { address, lat, lng } = req.body || {};
  calculateRouteInfo(address, lat, lng)
    .then((result) => res.json(result))
    .catch(next);
}