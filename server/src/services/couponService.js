// ============================================================
// couponService.js — SERVIÇO DE CUPONS
// ============================================================
// CRUD de cupons (admin) + validação (público).
//
// Validação considera:
//   - code case-insensitive (busca por UPPER(code))
//   - active === true
//   - dentro de start_date / end_date
//   - used_count < max_uses (se max_uses > 0)
//   - subtotal >= min_order_value (se > 0)
//   - per_customer_limit (conta ocorrências de customer_id em used_by)
//   - desconto = subtotal * discount_percent / 100
//
// IMPORTANTE: validate() NÃO incrementa used_count.
// O incremento será feito futuramente dentro da transação do placeOrder.
// ============================================================

import { couponRepository } from '../repositories/couponRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const couponService = {
  // GET /api/coupons — admin
  async list() {
    return couponRepository.findAll();
  },

  // GET /api/coupons/:id — admin
  async getById(id) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw httpError('Cupom não encontrado', 404);
    return coupon;
  },

  // POST /api/coupons — admin
  async create(data) {
    if (!data.code) throw httpError('Código é obrigatório', 400);
    if (data.discount_percent === undefined || data.discount_percent === null) {
      throw httpError('Percentual de desconto é obrigatório', 400);
    }

    const code = String(data.code).toUpperCase().trim();
    const discountPercent = Number(data.discount_percent);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      throw httpError('Percentual de desconto inválido (0-100)', 400);
    }

    const existing = await couponRepository.findByCode(code);
    if (existing) throw httpError('Já existe um cupom com este código', 409);

    return couponRepository.create({
      code,
      discount_percent: discountPercent,
      max_uses: data.max_uses !== undefined ? Number(data.max_uses) : 0,
      per_customer_limit: data.per_customer_limit !== undefined ? Number(data.per_customer_limit) : 1,
      min_order_value: data.min_order_value !== undefined ? Number(data.min_order_value) : 0,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      active: data.active !== undefined ? Boolean(data.active) : true,
      used_count: 0,
      used_by: [],
    });
  },

  // PUT /api/coupons/:id — admin
  async update(id, data) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) throw httpError('Cupom não encontrado', 404);

    const updateData = {};

    if (data.code !== undefined) {
      const code = String(data.code).toUpperCase().trim();
      if (code !== coupon.code) {
        const existing = await couponRepository.findByCode(code);
        if (existing && existing.id !== id) {
          throw httpError('Já existe um cupom com este código', 409);
        }
      }
      updateData.code = code;
    }
    if (data.discount_percent !== undefined) {
      const dp = Number(data.discount_percent);
      if (isNaN(dp) || dp < 0 || dp > 100) {
        throw httpError('Percentual de desconto inválido (0-100)', 400);
      }
      updateData.discount_percent = dp;
    }
    if (data.max_uses !== undefined) updateData.max_uses = Number(data.max_uses);
    if (data.per_customer_limit !== undefined) updateData.per_customer_limit = Number(data.per_customer_limit);
    if (data.min_order_value !== undefined) updateData.min_order_value = Number(data.min_order_value);
    if (data.start_date !== undefined) updateData.start_date = data.start_date || null;
    if (data.end_date !== undefined) updateData.end_date = data.end_date || null;
    if (data.active !== undefined) updateData.active = Boolean(data.active);
    if (data.used_count !== undefined) updateData.used_count = Number(data.used_count);
    if (data.used_by !== undefined) updateData.used_by = Array.isArray(data.used_by) ? data.used_by : [];

    return couponRepository.update(id, updateData);
  },

  // DELETE /api/coupons/:id — admin
  async remove(id) {
    const deleted = await couponRepository.delete(id);
    if (!deleted) throw httpError('Cupom não encontrado', 404);
    return { success: true };
  },

  // ============================================================
  // POST /api/coupons/validate — público
  // NÃO incrementa used_count. Apenas valida e calcula preview.
  // ============================================================
  // Retorna: { valid: true, discount, discount_percent, coupon_code, message }
  //      ou: { valid: false, message, status }
  // ============================================================
  async validate(couponCode, customerId, subtotal) {
    if (!couponCode) {
      return { valid: false, message: 'Informe um cupom', status: 400 };
    }
    if (subtotal == null || subtotal < 0) {
      return { valid: false, message: 'Subtotal inválido', status: 400 };
    }

    const code = String(couponCode).toUpperCase().trim();
    const coupon = await couponRepository.findByCode(code);

    if (!coupon) {
      return { valid: false, message: 'Cupom não encontrado', status: 404 };
    }
    if (!coupon.active) {
      return { valid: false, message: 'Cupom inativo', status: 403 };
    }

    const today = new Date().toISOString().split('T')[0];
    // pg retorna DATE como Date object — normalizar para string YYYY-MM-DD
    const startDate = coupon.start_date ? new Date(coupon.start_date).toISOString().split('T')[0] : null;
    const endDate = coupon.end_date ? new Date(coupon.end_date).toISOString().split('T')[0] : null;
    if (startDate && today < startDate) {
      return { valid: false, message: 'Cupom ainda não está disponível', status: 403 };
    }
    if (endDate && today > endDate) {
      return { valid: false, message: 'Cupom expirado', status: 403 };
    }

    if (coupon.max_uses > 0 && (coupon.used_count || 0) >= coupon.max_uses) {
      return { valid: false, message: 'Cupom esgotado', status: 403 };
    }

    if (coupon.min_order_value > 0 && subtotal < coupon.min_order_value) {
      return {
        valid: false,
        message: `Valor mínimo do pedido: R$ ${Number(coupon.min_order_value).toFixed(2).replace('.', ',')}`,
        status: 403,
      };
    }

    if (coupon.per_customer_limit > 0 && customerId) {
      const usedBy = Array.isArray(coupon.used_by) ? coupon.used_by : [];
      const customerUses = usedBy.filter((cid) => cid === customerId).length;
      if (customerUses >= coupon.per_customer_limit) {
        return { valid: false, message: 'Você já usou este cupom', status: 403 };
      }
    }

    const discount = Math.round(subtotal * coupon.discount_percent) / 100;

    return {
      valid: true,
      discount,
      discount_percent: coupon.discount_percent,
      coupon_code: coupon.code,
      message: `Cupom aplicado: ${coupon.discount_percent}% de desconto`,
    };
  },
};