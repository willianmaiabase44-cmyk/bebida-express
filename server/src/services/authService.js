// ============================================================
// authService.js — SERVIÇO DE AUTENTICAÇÃO
// ============================================================
// Três fluxos de autenticação (a implementar na Etapa 2):
//
// ADMIN:
//   - login com email + senha
//   - bcrypt.compare(password, user.password_hash)
//   - JWT com { id, role: 'admin', type: 'admin' }
//
// CLIENTE:
//   - identificação por número de celular (sem senha)
//   - busca ou cria customer
//   - JWT com { id, type: 'customer', name, phone }
//
// MOTOBOY:
//   - login + senha
//   - bcrypt.compare(password, driver.password_hash)
//   - JWT com { id, type: 'motoboy', name }
//
// NÃO substituir os sistemas atuais do frontend nesta etapa.
// ============================================================

import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

// STATUS: PENDENTE — Etapa 2
export async function loginAdmin(email, password) {
  throw new Error('loginAdmin ainda não implementado — Etapa 2');
}

// STATUS: PENDENTE — Etapa 2
export async function loginCustomer(phone, name, address) {
  throw new Error('loginCustomer ainda não implementado — Etapa 2');
}

// STATUS: PENDENTE — Etapa 2
export async function loginMotoboy(login, password) {
  throw new Error('loginMotoboy ainda não implementado — Etapa 2');
}