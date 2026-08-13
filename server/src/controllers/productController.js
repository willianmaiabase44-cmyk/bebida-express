// ============================================================
// productController.js — Handlers HTTP de produtos
// ============================================================

import { productService } from '../services/productService.js';

// GET /api/products — público (admin pode ver inativos com include_inactive=true)
export function list(req, res, next) {
  const isAdmin = req.user?.role === 'admin';
  const filters = {
    category: req.query.category,
    featured: req.query.featured === 'true',
    isNew: req.query.new === 'true',
    includeInactive: isAdmin && req.query.include_inactive === 'true',
  };

  productService
    .list(filters)
    .then((products) => res.json(products))
    .catch(next);
}

// GET /api/products/:id
export function getById(req, res, next) {
  const isAdmin = req.user?.role === 'admin';

  productService
    .getById(req.params.id, isAdmin)
    .then((product) => {
      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      res.json(product);
    })
    .catch(next);
}

// POST /api/products — admin
export function create(req, res, next) {
  productService
    .create(req.body)
    .then((product) => res.status(201).json(product))
    .catch(next);
}

// PUT /api/products/:id — admin
export function update(req, res, next) {
  productService
    .update(req.params.id, req.body)
    .then((product) => {
      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      res.json(product);
    })
    .catch(next);
}

// DELETE /api/products/:id — admin
export function remove(req, res, next) {
  productService
    .remove(req.params.id)
    .then((deleted) => {
      if (!deleted) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      res.json({ success: true });
    })
    .catch(next);
}