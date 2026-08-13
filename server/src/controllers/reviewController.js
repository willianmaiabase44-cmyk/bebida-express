// ============================================================
// reviewController.js — Handlers HTTP de avaliações de entrega
// ============================================================

import { reviewService } from '../services/reviewService.js';

export function list(req, res, next) {
  reviewService
    .listReviews(req.query)
    .then((reviews) => res.json(reviews))
    .catch(next);
}

export function getById(req, res, next) {
  reviewService
    .getReviewById(req.params.id)
    .then((review) => res.json(review))
    .catch(next);
}

export function create(req, res, next) {
  reviewService
    .createReview(req.body, req.user)
    .then((review) => res.status(201).json(review))
    .catch(next);
}