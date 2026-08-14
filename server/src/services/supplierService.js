// ============================================================
// supplierService.js — SERVIÇO DE FORNECEDORES (CRUD)
// ============================================================
// Apenas admin. Preserva todos os campos.
// ============================================================

import { supplierRepository } from '../repositories/supplierRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const supplierService = {
  async list({ active } = {}) {
    return supplierRepository.findAll({ active });
  },

  async getById(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) throw httpError('Fornecedor não encontrado', 404);
    return supplier;
  },

  async create(data) {
    if (!data.name) throw httpError('Nome é obrigatório', 400);

    return supplierRepository.create({
      name: data.name,
      contact_name: data.contact_name ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      cnpj: data.cnpj ?? null,
      category: data.category ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      active: data.active !== undefined ? Boolean(data.active) : true,
    });
  },

  async update(id, data) {
    const updateData = {};
    for (const f of ['name', 'contact_name', 'phone', 'email', 'cnpj', 'category', 'address', 'notes']) {
      if (data[f] !== undefined) updateData[f] = data[f];
    }
    if (data.active !== undefined) updateData.active = Boolean(data.active);

    const supplier = await supplierRepository.update(id, updateData);
    if (!supplier) throw httpError('Fornecedor não encontrado', 404);
    return supplier;
  },

  async remove(id) {
    const deleted = await supplierRepository.delete(id);
    if (!deleted) throw httpError('Fornecedor não encontrado', 404);
    return { success: true };
  },
};