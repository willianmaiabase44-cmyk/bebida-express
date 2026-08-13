// ============================================================
// motoboyService.js — SERVIÇO DE MOTOBOYS
// ============================================================
// CRUD administrativo + consultas de pedidos e avaliações.
// Regras de negócio:
//   - login único
//   - senha sempre com bcryptjs
//   - nunca devolver password_hash
//   - motoboy inativo não autentica (validado no authService)
//   - motoboy autenticado só consulta próprios pedidos/avaliações
// ============================================================

import { deliveryDriverRepository } from '../repositories/deliveryDriverRepository.js';
import { deliveryReviewRepository } from '../repositories/deliveryReviewRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { hashPassword } from '../utils/password.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const motoboyService = {
  // ============================================================
  // CRUD (admin only — enforced by route middleware)
  // ============================================================

  async list(filters) {
    return deliveryDriverRepository.findAll(filters);
  },

  async getById(id) {
    const driver = await deliveryDriverRepository.findByIdSafe(id);
    if (!driver) throw httpError('Motoboy não encontrado', 404);
    return driver;
  },

  async create(data) {
    if (!data.name || !data.phone || !data.login) {
      throw httpError('Nome, telefone e login são obrigatórios', 400);
    }
    if (!data.password) {
      throw httpError('Senha é obrigatória', 400);
    }

    const existing = await deliveryDriverRepository.findByLogin(data.login);
    if (existing) {
      throw httpError('Login já cadastrado', 409);
    }

    const passwordHash = await hashPassword(data.password);

    return deliveryDriverRepository.create({
      name: data.name,
      phone: data.phone,
      login: data.login,
      password_hash: passwordHash,
      vehicle_type: data.vehicle_type,
      plate: data.plate,
      status: data.status,
      rating: data.rating,
      total_deliveries: data.total_deliveries,
      active: data.active,
    });
  },

  async update(id, data) {
    const driver = await deliveryDriverRepository.findById(id);
    if (!driver) throw httpError('Motoboy não encontrado', 404);

    if (data.login && data.login !== driver.login) {
      const existing = await deliveryDriverRepository.findByLogin(data.login);
      if (existing) throw httpError('Login já cadastrado', 409);
    }

    const updateData = { ...data };
    if (updateData.password) {
      updateData.password_hash = await hashPassword(updateData.password);
      delete updateData.password;
    }

    return deliveryDriverRepository.update(id, updateData);
  },

  async remove(id) {
    const driver = await deliveryDriverRepository.findById(id);
    if (!driver) throw httpError('Motoboy não encontrado', 404);
    await deliveryDriverRepository.delete(id);
    return { success: true };
  },

  // ============================================================
  // GET /api/motoboys/:id/orders — pedidos do motoboy
  // ============================================================
  async getMotoboyOrders(motoboyId, type, currentUser) {
    if (currentUser.type === 'motoboy' && currentUser.id !== motoboyId) {
      throw httpError('Acesso negado', 403);
    }

    const driver = await deliveryDriverRepository.findByIdSafe(motoboyId);
    if (!driver) throw httpError('Motoboy não encontrado', 404);

    const allOrders = await orderRepository.findByMotoboyId(motoboyId);

    if (type === 'history') {
      return allOrders.filter((o) => ['entregue', 'cancelado'].includes(o.status));
    }
    return allOrders.filter((o) => ['pronto', 'saiu_para_entrega'].includes(o.status));
  },

  // ============================================================
  // GET /api/motoboys/:id/reviews — avaliações do motoboy
  // ============================================================
  async getMotoboyReviews(motoboyId, currentUser) {
    if (currentUser.type === 'motoboy' && currentUser.id !== motoboyId) {
      throw httpError('Acesso negado', 403);
    }

    const driver = await deliveryDriverRepository.findByIdSafe(motoboyId);
    if (!driver) throw httpError('Motoboy não encontrado', 404);

    return deliveryReviewRepository.findByMotoboyId(motoboyId);
  },

  // ============================================================
  // GET /api/motoboys/reviews — todas as avaliações agregadas (admin)
  // Equivalente a getMotoboyReviews do Base44
  // ============================================================
  async getAllMotoboyReviews() {
    const drivers = await deliveryDriverRepository.findAll({ limit: 500 });
    const reviews = await deliveryReviewRepository.findAll({ limit: 500 });

    return drivers.map((driver) => {
      const driverReviews = reviews.filter((r) => r.motoboy_id === driver.id);
      const avg =
        driverReviews.length > 0
          ? driverReviews.reduce((s, r) => s + (r.rating || 0), 0) / driverReviews.length
          : driver.rating || 5;
      return {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        active: driver.active,
        total_deliveries: driver.total_deliveries || 0,
        rating: Math.round(avg * 10) / 10,
        reviews_count: driverReviews.length,
        reviews: driverReviews,
      };
    });
  },
};