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
import { refreshTokenRepository } from '../repositories/refreshTokenRepository.js';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { config } from '../config/index.js';

// Calcula a data de expiração do refresh token
function refreshExpiryDate() {
  const expiresStr = config.jwt.refreshExpiresIn;
  const ms = parseDurationToMs(expiresStr);
  return new Date(Date.now() + ms);
}

function parseDurationToMs(str) {
  const match = /^(\d+)([smhdwy])$/.exec(str || '7d');
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, y: 31536000000 };
  return num * units[unit];
}

// Emite par access + refresh e persiste o refresh token
async function issueTokens(payload, userType, client = undefined) {
  const access_token = signAccessToken(payload);
  const refresh = await refreshTokenRepository.create(
    { user_id: payload.id, user_type: userType, expires_at: refreshExpiryDate() },
    client
  );
  return { access_token, refresh_token: refresh.token };
}

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

  const payload = {
    id: user.id,
    role: user.role,
    type: 'admin',
    email: user.email,
  };
  const tokens = await issueTokens(payload, 'admin');

  return { ...tokens, user: sanitize(user) };
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
    const payload = {
      id: existing.id,
      type: 'customer',
      name: existing.name,
      phone: existing.phone,
    };
    const tokens = await issueTokens(payload, 'customer');
    return { ...tokens, customer: existing, addresses, is_new: false };
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

  const payload = {
    id: customer.id,
    type: 'customer',
    name: customer.name,
    phone: customer.phone,
  };
  const tokens = await issueTokens(payload, 'customer');

  return { ...tokens, customer, addresses, is_new: true };
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

  const payload = {
    id: driver.id,
    type: 'motoboy',
    name: driver.name,
    login: driver.login,
  };
  const tokens = await issueTokens(payload, 'motoboy');

  return { ...tokens, motoboy: sanitize(driver) };
}

// ============================================================
// POST /api/auth/refresh — renova access token via refresh token
// ============================================================
export async function refreshAccessToken(refreshTokenValue) {
  if (!refreshTokenValue) {
    throw httpError('Refresh token não fornecido', 400);
  }

  // Verifica assinatura do JWT
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw httpError('Refresh token inválido', 401);
  }

  // Verifica se existe no banco e não foi revogado
  const stored = await refreshTokenRepository.findValid(refreshTokenValue);
  if (!stored) {
    throw httpError('Refresh token expirado ou revogado', 401);
  }

  // Revoga o refresh token usado (rotação)
  await refreshTokenRepository.revoke(refreshTokenValue);

  // Emite novos tokens
  const newPayload = {
    id: payload.id,
    type: payload.type,
    ...(payload.role ? { role: payload.role } : {}),
    ...(payload.email ? { email: payload.email } : {}),
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.phone ? { phone: payload.phone } : {}),
    ...(payload.login ? { login: payload.login } : {}),
  };
  const tokens = await issueTokens(newPayload, payload.type);

  return tokens;
}

// ============================================================
// POST /api/auth/password-reset/request — solicita reset de senha
// ============================================================
// Gera um token de reset, armazena hasheado no banco.
// O envio por email fica a cargo de uma camada de notificação
// (ainda não implementada no /server — sem dependência do Base44).
// ============================================================
export async function requestPasswordReset(email) {
  if (!email) {
    throw httpError('Email é obrigatório', 400);
  }

  const user = await userRepository.findByEmail(email);
  // Sempre retorna sucesso — não revela se o email existe
  if (!user) {
    return { success: true };
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  const token = await userRepository.createPasswordResetToken(user.id, expiresAt);

  // TODO: enviar email com o link /reset-password?token=<token>
  // Por enquanto o token é gerado mas não enviado (sem infra de email no /server).
  // Em desenvolvimento, pode ser obtido via log ou resposta de teste.
  if (config.nodeEnv === 'development') {
    console.log('[password-reset] token for', email, ':', token);
  }

  return { success: true };
}

// ============================================================
// POST /api/auth/password-reset/confirm — redefine a senha
// ============================================================
export async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    throw httpError('Token e nova senha são obrigatórios', 400);
  }
  if (newPassword.length < 6) {
    throw httpError('A senha deve ter no mínimo 6 caracteres', 400);
  }

  const resetRecord = await userRepository.findValidPasswordResetToken(token);
  if (!resetRecord) {
    throw httpError('Token inválido ou expirado', 401);
  }

  const password_hash = await hashPassword(newPassword);
  await userRepository.updatePassword(resetRecord.user_id, password_hash);
  await userRepository.markPasswordResetTokenUsed(token);

  // Revoga todos os refresh tokens do usuário (força novo login)
  await refreshTokenRepository.revokeByUserId(resetRecord.user_id, 'admin').catch(() => {});

  return { success: true };
}

// ============================================================
// POST /api/auth/logout — revoga refresh tokens do usuário
// ============================================================
export async function logoutUser(payload, refreshTokenValue) {
  if (refreshTokenValue) {
    await refreshTokenRepository.revoke(refreshTokenValue).catch(() => {});
  }
  if (payload?.id && payload?.type) {
    await refreshTokenRepository.revokeByUserId(payload.id, payload.type).catch(() => {});
  }
  return { success: true };
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