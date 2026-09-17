// ============================================================
// authService.js — Autenticação com fallback Base44
// ============================================================
// Tenta o backend /server primeiro. Se estiver fora (preview),
// faz fallback para as funções/auth do Base44.
// ============================================================

import { api } from '@/lib/apiClient';
import { isServerDown, markServerDown, tryServer, invokeBase44 } from '@/lib/serverHealth';
import { base44 } from '@/api/base44Client';

const ADMIN_KEY = 'smoke_admin_auth';

// --- Admin ---------------------------------------------------------

export async function loginAdmin(email, password) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/auth/admin/login', { email, password }));
    if (result.ok) {
      const data = await result.res.json();
      localStorage.setItem(ADMIN_KEY, JSON.stringify({
        type: 'admin',
        user: data.user,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      }));
      return data;
    }
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Credenciais inválidas');
    }
  }
  // Fallback: Base44 auth
  await base44.auth.loginViaEmailPassword(email, password);
  const fakeSession = {
    type: 'admin',
    user: { email, type: 'admin', role: 'admin' },
    access_token: 'base44-fallback-admin',
    refresh_token: null,
  };
  localStorage.setItem(ADMIN_KEY, JSON.stringify(fakeSession));
  return fakeSession;
}

// --- Cliente -------------------------------------------------------

export async function loginCustomer(phone, name) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/auth/customer', { phone, name }));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao autenticar cliente');
    }
  }
  // Fallback: Base44 customerAuth function
  const data = await invokeBase44('customerAuth', { phone, name });
  return {
    access_token: 'base44-fallback-customer',
    refresh_token: null,
    customer: data.customer,
    addresses: data.addresses || [],
    is_new: data.is_new,
    exists: data.exists,
  };
}

// --- Motoboy -------------------------------------------------------

export async function loginMotoboy(login, password) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/auth/motoboy', { login, password }));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Credenciais inválidas');
    }
  }
  // Fallback: Base44 motoboyLogin function
  const data = await invokeBase44('motoboyLogin', { login, password });
  return {
    access_token: 'base44-fallback-motoboy',
    refresh_token: null,
    motoboy: data.driver,
  };
}

// --- Usuário atual -------------------------------------------------

export async function getMe() {
  if (!isServerDown()) {
    const result = await tryServer(() => api.get('/auth/me'));
    if (result.ok) return await result.res.json();
    if (!result.down) throw new Error('Token inválido ou expirado');
  }
  // Fallback: Base44 auth
  const me = await base44.auth.me();
  return { type: 'admin', user: { ...me, type: 'admin' } };
}

// --- Logout --------------------------------------------------------

export async function logout() {
  if (!isServerDown()) {
    try {
      await api.post('/auth/logout', {});
    } catch {}
  }
  // Fallback: também tenta logout do Base44
  try {
    await base44.auth.logout();
  } catch {}
  localStorage.removeItem(ADMIN_KEY);
}

// --- Recuperação de senha ------------------------------------------

export async function requestPasswordReset(email) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/auth/password-reset/request', { email }));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao solicitar recuperação');
    }
  }
  // Sem fallback para reset de senha — retorna sucesso genérico
  return { success: true };
}

export async function resetPassword(token, newPassword) {
  if (!isServerDown()) {
    const result = await tryServer(() => api.post('/auth/password-reset/confirm', { token, newPassword }));
    if (result.ok) return await result.res.json();
    if (!result.down) {
      const data = await result.res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao redefinir senha');
    }
  }
  throw new Error('Backend indisponível. Tente novamente mais tarde.');
}

// --- Estado local --------------------------------------------------

export function getStoredAdmin() {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAdminAuthenticated() {
  return !!getStoredAdmin()?.access_token;
}