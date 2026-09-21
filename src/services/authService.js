// ============================================================
// authService.js — Autenticação via API /server (sem fallback)
// ============================================================

import { apiJson } from '@/lib/apiClient';

const ADMIN_KEY = 'smoke_admin_auth';

// --- Admin ---------------------------------------------------------

export async function loginAdmin(email, password) {
  const data = await apiJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(ADMIN_KEY, JSON.stringify({
    type: 'admin',
    user: data.user,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  }));
  return data;
}

// --- Cliente -------------------------------------------------------

export async function loginCustomer(phone, name) {
  return apiJson('/auth/customer', {
    method: 'POST',
    body: JSON.stringify({ phone, name }),
  });
}

// --- Motoboy -------------------------------------------------------

export async function loginMotoboy(login, password) {
  return apiJson('/auth/motoboy', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
}

// --- Usuário atual -------------------------------------------------

export async function getMe() {
  return apiJson('/auth/me');
}

// --- Logout --------------------------------------------------------

export async function logout() {
  try {
    await apiJson('/auth/logout', { method: 'POST', body: '{}' });
  } catch {}
  localStorage.removeItem(ADMIN_KEY);
}

// --- Recuperação de senha ------------------------------------------

export async function requestPasswordReset(email) {
  return apiJson('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, newPassword) {
  return apiJson('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
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