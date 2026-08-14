// ============================================================
// promotionService.js — SERVIÇO DE PROMOÇÕES (CRUD)
// ============================================================
// GET público: apenas promoções ativas e vigentes.
// Admin: CRUD completo.
// Regras:
//   - validar product_id (produto deve existir)
//   - promo_price > 0
//   - validar datas (start_date <= end_date)
//   - original_price derivada do produto (não confia no frontend)
// ============================================================

import { pool } from '../db/index.js';
import { promotionRepository } from '../repositories/promotionRepository.js';
import { productRepository } from '../repositories/productRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const promotionService = {
  // GET público — apenas ativas e vigentes
  async listActive() {
    return promotionRepository.findAll({ activeOnly: true });
  },

  // GET admin — todas
  async listAll() {
    return promotionRepository.findAll({ activeOnly: false });
  },

  async getById(id) {
    const promotion = await promotionRepository.findById(id);
    if (!promotion) throw httpError('Promoção não encontrada', 404);
    return promotion;
  },

  async create(data) {
    const { product_id, promo_price, start_date, end_date, banner_url, active } = data;

    if (!product_id) throw httpError('Produto é obrigatório', 400);
    if (!promo_price || Number(promo_price) <= 0) {
      throw httpError('Preço promocional deve ser maior que zero', 400);
    }
    if (!start_date || !end_date) throw httpError('Data de início e fim são obrigatórias', 400);

    const startDate = new Date(start_date).toISOString().split('T')[0];
    const endDate = new Date(end_date).toISOString().split('T')[0];
    if (startDate > endDate) {
      throw httpError('Data de início não pode ser posterior à data de fim', 400);
    }

    // Validar produto e derivar original_price
    const product = await productRepository.findById(product_id);
    if (!product) throw httpError('Produto não encontrado', 404);

    return promotionRepository.create({
      product_id,
      product_name: product.name,
      original_price: Number(product.price), // deriva do produto — ignora frontend
      promo_price: Number(promo_price),
      start_date: startDate,
      end_date: endDate,
      banner_url: banner_url ?? null,
      active: active !== undefined ? Boolean(active) : true,
    });
  },

  async update(id, data) {
    // Verificar existência
    const existing = await promotionRepository.findById(id);
    if (!existing) throw httpError('Promoção não encontrada', 404);

    const updateData = {};

    if (data.product_id !== undefined) {
      const product = await productRepository.findById(data.product_id);
      if (!product) throw httpError('Produto não encontrado', 404);
      updateData.product_id = data.product_id;
      updateData.product_name = product.name;
      updateData.original_price = Number(product.price);
    }

    if (data.promo_price !== undefined) {
      if (Number(data.promo_price) <= 0) {
        throw httpError('Preço promocional deve ser maior que zero', 400);
      }
      updateData.promo_price = Number(data.promo_price);
    }

    if (data.start_date !== undefined) {
      updateData.start_date = new Date(data.start_date).toISOString().split('T')[0];
    }
    if (data.end_date !== undefined) {
      updateData.end_date = new Date(data.end_date).toISOString().split('T')[0];
    }

    // Validar datas combinadas (existentes + novas)
    const finalStart = updateData.start_date || existing.start_date.toISOString().split('T')[0];
    const finalEnd = updateData.end_date || existing.end_date.toISOString().split('T')[0];
    if (finalStart > finalEnd) {
      throw httpError('Data de início não pode ser posterior à data de fim', 400);
    }

    if (data.banner_url !== undefined) updateData.banner_url = data.banner_url;
    if (data.active !== undefined) updateData.active = Boolean(data.active);

    return promotionRepository.update(id, updateData);
  },

  async remove(id) {
    const deleted = await promotionRepository.delete(id);
    if (!deleted) throw httpError('Promoção não encontrada', 404);
    return { success: true };
  },
};