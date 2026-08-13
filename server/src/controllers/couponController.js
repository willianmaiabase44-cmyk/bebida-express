// ============================================================
// couponController.js — Handlers HTTP de cupons
// ============================================================
// CRUD é admin. Validate é público.
// ============================================================

import { couponService } from '../services/couponService.js';

export function list(req, res, next) {
  couponService
    .list()
    .then((coupons) => res.json(coupons))
    .catch(next);
}

export function getById(req, res, next) {
  couponService
    .getById(req.params.id)
    .then((coupon) => res.json(coupon))
    .catch(next);
}

export function create(req, res, next) {
  couponService
    .create(req.body)
    .then((coupon) => res.status(201).json(coupon))
    .catch(next);
}

export function update(req, res, next) {
  couponService
    .update(req.params.id, req.body)
    .then((coupon) => res.json(coupon))
    .catch(next);
}

export function remove(req, res, next) {
  couponService
    .remove(req.params.id)
    .then((result) => res.json(result))
    .catch(next);
}

// POST /api/coupons/validate — público (preview, não incrementa)
export function validate(req, res, next) {
  const { coupon_code, customer_id, subtotal } = req.body || {};
  couponService
    .validate(coupon_code, customer_id, subtotal)
    .then((result) => {
      if (result.valid) {
        return res.json(result);
      }
      return res.status(result.status || 400).json(result);
    })
    .catch(next);
}