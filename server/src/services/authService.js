// ============================================================
// authService.js — SERVIÇO DE AUTENTICAÇÃO
// ============================================================
// Três fluxos de autenticação:
//
// ADMIN:
//   - login com email + senha
//   - bcrypt.compare(password, user.password_hash)
//   - JWT com { id, role: 'admin', type: 'admin', email }
//
// CLIENTE:
//   - identificação por número de celular (sem senha)
//   - busca ou cria customer
//   - JWT com { id, type: 'customer', name, phone }
//
// MOTOBOY:
//   - login + senha
//   - bcrypt.compare(password, driver.password_hash)
//   - JWT com { id, type: 'motoboy', name, login }
//
// NUNCA devolver password_hash ou password_salt.
// ============================================================

import { userRepository } from '../repositories/userRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { customerAddressRepository } from '../repositories/customerAddressRepository.js';
import { deliveryDriverRepository } from '../repositories/deliveryDriverRepository.js';
import { verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

// Normalização de telefone (igual ao customerAuth do Base44)
function normalizePhone(phone) {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits;
}

// Remove password_hash e password_salt de qualquer objeto
function sanitize(obj) {
  if (!obj) return null;
  const { password_hash, password_salt, ...safe } = obj;
  return safe;
}

// Erro com status HTTP
function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ============================================================
// ADMIN
// ============================================================
export async function loginAdmin(email, password) {
  if (!email || !password) {
    throw httpError('Email e senha são obrigatórios', 400);
  }

  const user = await userRepository.findByEmail(email);
  if (!user || !user.password_hash) {
    throw httpError('Credenciais inválidas', 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw httpError('Credenciais inválidas', 401);
  }

  if (user.role !== 'admin') {
    throw httpError('Acesso restrito a administradores', 403);
  }

  const token = signToken({
    id: user.id,
    role: user.role,
    type: 'admin',
    email: user.email,
  });

  return { token, user: sanitize(user) };
}

// ============================================================
// CLIENTE
// ============================================================
export async function loginCustomer(phone, name, address) {
  if (!phone) {
    throw httpError('Celular é obrigatório', 400);
  }

  const normalizedPhone = normalizePhone(phone);
  const existing = await customerRepository.findByPhone(normalizedPhone);

  if (existing) {
    const addresses = await customerAddressRepository.findByCustomerId(existing.id);
    const token = signToken({
      id: existing.id,
      type: 'customer',
      name: existing.name,
      phone: existing.phone,
    });
    return { token, customer: existing, addresses, is_new: false };
  }

  // Cliente novo — precisa de nome
  if (!name) {
    return { exists: false };
  }

  const customer = await customerRepository.create({
    name,
    phone: normalizedPhone,
  });

  let addresses = [];
  if (
    address &&
    address.cep &&
    address.street &&
    address.number &&
    address.district &&
    address.city &&
    address.state
  ) {
    const addr = await customerAddressRepository.create({
      customer_id: customer.id,
      ...address,
    });
    addresses = [addr];
  }

  const token = signToken({
    id: customer.id,
    type: 'customer',
    name: customer.name,
    phone: customer.phone,
  });

  return { token, customer, addresses, is_new: true };
}

// ============================================================
// MOTOBOY
// ============================================================
export async function loginMotoboy(login, password) {
  if (!login || !password) {
    throw httpError('Login e senha são obrigatórios', 400);
  }

  const driver = await deliveryDriverRepository.findByLogin(login);
  if (!driver) {
    throw httpError('Credenciais inválidas', 401);
  }

  const valid = await verifyPassword(password, driver.password_hash);
  if (!valid) {
    throw httpError('Credenciais inválidas', 401);
  }

  if (!driver.active) {
    throw httpError('Motoboy inativo. Contate o administrador.', 403);
  }

  const token = signToken({
    id: driver.id,
    type: 'motoboy',
    name: driver.name,
    login: driver.login,
  });

  return { token, motoboy: sanitize(driver) };
}

// ============================================================
// GET /api/auth/me — retorna o registro completo conforme o tipo
// ============================================================
export async function getMe(payload) {
  if (!payload || !payload.type) {
    throw httpError('Token sem tipo definido', 401);
  }

  switch (payload.type) {
    case 'admin': {
      const user = await userRepository.findByIdSafe(payload.id);
      if (!user) throw httpError('Usuário não encontrado', 404);
      return { type: 'admin', user };
    }
    case 'customer': {
      const customer = await customerRepository.findById(payload.id);
      if (!customer) throw httpError('Cliente não encontrado', 404);
      return { type: 'customer', customer };
    }
    case 'motoboy': {
      const motoboy = await deliveryDriverRepository.findByIdSafe(payload.id);
      if (!motoboy) throw httpError('Motoboy não encontrado', 404);
      return { type: 'motoboy', motoboy };
    }
    default:
      throw httpError('Tipo de usuário desconhecido', 401);
  }
}