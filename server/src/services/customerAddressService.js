// ============================================================
// customerAddressService.js — SERVIÇO DE ENDEREÇOS DE CLIENTES
// ============================================================
// CRUD de endereços com validação de ownership.
// Cliente só acessa seus próprios endereços. Admin acessa qualquer.
// ============================================================

import { customerAddressRepository } from '../repositories/customerAddressRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const customerAddressService = {
  // GET /api/addresses/:customerId
  // Ownership: customer só lista seus próprios; admin lista qualquer.
  async listByCustomer(customerId, user) {
    if (user.type === 'customer' && user.id !== customerId) {
      throw httpError('Acesso negado a endereços de outro cliente', 403);
    }
    // Valida que o cliente existe
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw httpError('Cliente não encontrado', 404);

    return customerAddressRepository.findByCustomerId(customerId);
  },

  // POST /api/addresses
  // Ownership: customer cria para si mesmo; admin cria para qualquer.
  async create(data, user) {
    if (!data.customer_id) throw httpError('customer_id é obrigatório', 400);
    if (user.type === 'customer' && data.customer_id !== user.id) {
      throw httpError('Não é possível criar endereço para outro cliente', 403);
    }

    const customer = await customerRepository.findById(data.customer_id);
    if (!customer) throw httpError('Cliente não encontrado', 404);

    if (!data.street) throw httpError('Rua é obrigatória', 400);
    if (!data.number) throw httpError('Número é obrigatório', 400);
    if (!data.district) throw httpError('Bairro é obrigatório', 400);
    if (!data.city) throw httpError('Cidade é obrigatória', 400);
    if (!data.state) throw httpError('Estado é obrigatório', 400);

    return customerAddressRepository.create({
      customer_id: data.customer_id,
      label: data.label,
      cep: data.cep,
      street: data.street,
      number: data.number,
      complement: data.complement,
      district: data.district,
      city: data.city,
      state: data.state,
      reference: data.reference,
      lat: data.lat,
      lng: data.lng,
    });
  },

  // PUT /api/addresses/:id
  // Ownership: busca endereço, verifica se pertence ao cliente (ou admin).
  async update(id, data, user) {
    const addr = await customerAddressRepository.findById(id);
    if (!addr) throw httpError('Endereço não encontrado', 404);

    if (user.type === 'customer' && addr.customer_id !== user.id) {
      throw httpError('Acesso negado a endereço de outro cliente', 403);
    }

    // customer_id não pode ser alterado via update
    const updateData = { ...data };
    delete updateData.customer_id;

    return customerAddressRepository.update(id, updateData);
  },

  // DELETE /api/addresses/:id
  // Ownership: busca endereço, verifica se pertence ao cliente (ou admin).
  async remove(id, user) {
    const addr = await customerAddressRepository.findById(id);
    if (!addr) throw httpError('Endereço não encontrado', 404);

    if (user.type === 'customer' && addr.customer_id !== user.id) {
      throw httpError('Acesso negado a endereço de outro cliente', 403);
    }

    await customerAddressRepository.delete(id);
    return { success: true };
  },
};