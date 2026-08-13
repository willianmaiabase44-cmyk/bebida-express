// ============================================================
// customerService.js — SERVIÇO DE CLIENTES (admin)
// ============================================================
// CRUD de clientes para o painel administrativo.
// Telefone normalizado e único (never duplicar por telefone).
// ============================================================

import { customerRepository } from '../repositories/customerRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Normalização de telefone (igual ao authService)
function normalizePhone(phone) {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits;
}

export const customerService = {
  // GET /api/customers — admin
  async list({ search } = {}) {
    return customerRepository.findAll({ search });
  },

  // GET /api/customers/:id — admin
  async getById(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw httpError('Cliente não encontrado', 404);
    return customer;
  },

  // POST /api/customers — admin
  async create(data) {
    if (!data.name) throw httpError('Nome é obrigatório', 400);
    if (!data.phone) throw httpError('Celular é obrigatório', 400);

    const phone = normalizePhone(data.phone);
    if (!phone) throw httpError('Celular inválido', 400);

    const existing = await customerRepository.findByPhone(phone);
    if (existing) throw httpError('Já existe um cliente com este celular', 409);

    return customerRepository.create({
      name: data.name,
      phone,
      email: data.email || null,
    });
  },

  // PUT /api/customers/:id — admin
  async update(id, data) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw httpError('Cliente não encontrado', 404);

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) {
      const phone = normalizePhone(data.phone);
      if (!phone) throw httpError('Celular inválido', 400);
      if (phone !== customer.phone) {
        const existing = await customerRepository.findByPhone(phone);
        if (existing && existing.id !== id) {
          throw httpError('Já existe um cliente com este celular', 409);
        }
      }
      updateData.phone = phone;
    }

    return customerRepository.update(id, updateData);
  },

  // DELETE /api/customers/:id — admin (cascade deleta endereços)
  async remove(id) {
    const deleted = await customerRepository.delete(id);
    if (!deleted) throw httpError('Cliente não encontrado', 404);
    return { success: true };
  },
};