// ============================================================
// reviewService.js — Avaliações via API /server
// ============================================================

import { apiJson } from '@/lib/apiClient';

export function listReviews() {
  return apiJson('/reviews');
}

export function getReview(id) {
  return apiJson(`/reviews/${id}`);
}

export function createReview(data) {
  return apiJson('/reviews', { method: 'POST', body: JSON.stringify(data) });
}