// ============================================================
// deliveryService.js — SERVIÇO DE ENTREGAS (entidade Delivery)
// ============================================================
// CRUD administrativo da entidade Delivery.
// NÃO confundir com Order — Delivery é uma entrega manual/
// complementar, preservada do Base44.
// ============================================================

import { deliveryRepository } from '../repositories/deliveryRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const VALID_DELIVERY_STATUSES = ['pendente', 'em_rota', 'entregue', 'cancelada'];

export const deliveryService = {
  async list(filters) {
    return deliveryRepository.findAll(filters);
  },

  async getById(id) {
    const delivery = await deliveryRepository.findById(id);
    if (!delivery) throw httpError('Entrega não encontrada', 404);
    return delivery;
  },

  async create(data) {
    if (!data.client_name) throw httpError('Nome do cliente é obrigatório', 400);
    if (!data.address) throw httpError('Endereço é obrigatório', 400);
    if (!data.date) throw httpError('Data é obrigatória', 400);
    return deliveryRepository.create(data);
  },

  async update(id, data) {
    const delivery = await deliveryRepository.findById(id);
    if (!delivery) throw httpError('Entrega não encontrada', 404);
    return deliveryRepository.update(id, data);
  },

  async updateStatus(id, status) {
    if (!VALID_DELIVERY_STATUSES.includes(status)) {
      throw httpError('Status inválido', 400);
    }
    const delivery = await deliveryRepository.findById(id);
    if (!delivery) throw httpError('Entrega não encontrada', 404);
    return deliveryRepository.updateStatus(id, status);
  },

  async remove(id) {
    const delivery = await deliveryRepository.findById(id);
    if (!delivery) throw httpError('Entrega não encontrada', 404);
    await deliveryRepository.delete(id);
    return { success: true };
  },
};