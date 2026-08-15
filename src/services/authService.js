// ============================================================
// authService.js — Serviço de autenticação independente do Base44
// ============================================================
// Comunica-se exclusivamente com o backend /server via apiClient.
// Nenhuma dependência do Base44 neste arquivo.
// ============================================================

import { api } from '@/lib/apiClient';

const ADMIN_KEY = 'smoke_admin_auth';

// --- Admin ---------------------------------------------------------

export async function loginAdmin(email, password) {
  const res = await api.post('/auth/admin/login', { email, password });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Credenciais inválidas');
  }
  const data = await res.json();
  // Armazena tokens no localStorage
  localStorage.setItem(
    ADMIN_KEY,
    JSON.stringify({
      type: 'admin',
      user: data.user,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
  );
  return data;
}

// --- Cliente -------------------------------------------------------

export async function loginCustomer(phone, name) {
  const res = await api.post('/auth/customer', { phone, name });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao autenticar cliente');
  }
  const data = await res.json();
  // Retorna os dados — o CustomerContext armazena
  return data;
}

// --- Motoboy -------------------------------------------------------

export async function loginMotoboy(login, password) {
  const res = await api.post('/auth/motoboy', { login, password });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Credenciais inválidas');
  }
  const data = await res.json();
  // Retorna os dados — o MotoboyContext armazena
  return data;
}

// --- Usuário atual -------------------------------------------------

export async function getMe() {
  const res = await api.get('/auth/me');
  if (!res.ok) {
    throw new Error('Token inválido ou expirado');
  }
  return res.json();
}

// --- Logout --------------------------------------------------------

export async function logout() {
  try {
    await api.post('/auth/logout', {});
  } catch {
    // ignora erro de rede no logout
  }
  localStorage.removeItem(ADMIN_KEY);
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