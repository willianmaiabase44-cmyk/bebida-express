// ============================================================
// productService.js — SERVIÇO DE PRODUTOS
// ============================================================
// Regras de negócio: validação, filtros, regras de visibilidade.
// SQL fica nos repositórios.
// ============================================================

import { productRepository } from '../repositories/productRepository.js';

const VALID_CATEGORIES = [
  'cervejas', 'refrigerantes', 'energeticos', 'aguas',
  'destilados', 'vinhos', 'sucos', 'gelo',
];

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const productService = {
  // GET /api/products — público: só active=true por padrão
  async list({ category, featured, isNew, includeInactive } = {}) {
    return productRepository.findAll({ category, featured, isNew, includeInactive });
  },

  // GET /api/products/:id — não-admin não vê produtos inativos
  async getById(id, isAdmin = false) {
    const product = await productRepository.findById(id);
    if (!product) return null;
    if (!product.active && !isAdmin) return null;
    return product;
  },

  // POST /api/products — preserva TODOS os campos
  async create(data) {
    if (!data.name) throw httpError('Nome é obrigatório', 400);
    if (!data.category) throw httpError('Categoria é obrigatória', 400);
    if (!VALID_CATEGORIES.includes(data.category)) {
      throw httpError(`Categoria inválida. Use: ${VALID_CATEGORIES.join(', ')}`, 400);
    }
    if (data.price === undefined || data.price === null || isNaN(Number(data.price))) {
      throw httpError('Preço é obrigatório', 400);
    }

    const productData = {
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      price: Number(data.price),
      cost_price: data.cost_price !== undefined ? Number(data.cost_price) : null,
      stock: data.stock !== undefined ? Number(data.stock) : 0,
      min_stock: data.min_stock !== undefined ? Number(data.min_stock) : 5,
      image_url: data.image_url ?? null,
      is_featured: Boolean(data.is_featured),
      is_new: Boolean(data.is_new),
      total_sold: data.total_sold !== undefined ? Number(data.total_sold) : 0,
      active: data.active !== undefined ? Boolean(data.active) : true,
    };

    return productRepository.create(productData);
  },

  // PUT /api/products/:id — atualiza apenas campos enviados
  async update(id, data) {
    if (data.category && !VALID_CATEGORIES.includes(data.category)) {
      throw httpError(`Categoria inválida. Use: ${VALID_CATEGORIES.join(', ')}`, 400);
    }

    const updateData = { ...data };
    // Normaliza tipos numéricos
    for (const f of ['price', 'cost_price', 'stock', 'min_stock', 'total_sold']) {
      if (updateData[f] !== undefined && updateData[f] !== null) {
        updateData[f] = Number(updateData[f]);
      }
    }
    // Normaliza booleanos
    for (const f of ['is_featured', 'is_new', 'active']) {
      if (updateData[f] !== undefined) {
        updateData[f] = Boolean(updateData[f]);
      }
    }

    return productRepository.update(id, updateData);
  },

  // DELETE /api/products/:id — exclusão física (cascade em stock_movements e promotions)
  async remove(id) {
    return productRepository.delete(id);
  },
};