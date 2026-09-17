// ============================================================
// serverHealth.js — Flag de disponibilidade do backend /server
// ============================================================
// Quando o /server (Node.js/PostgreSQL) está fora (ex: preview),
// os services fazem fallback para as funções do Base44.
// O flag é per-session: resetado no reload da página.
// ============================================================

import { base44 } from '@/api/base44Client';

let _serverDown = false;

export function isServerDown() {
  return _serverDown;
}

export function markServerDown() {
  _serverDown = true;
}

export function resetServerHealth() {
  _serverDown = false;
}

// Helper: tenta uma chamada ao /server, retorna { ok, data, status }.
// Em caso de erro de rede ou 5xx, marca o server como down.
export async function tryServer(fn) {
  try {
    const res = await fn();
    if (res.status >= 500) {
      markServerDown();
      return { ok: false, status: res.status, down: true };
    }
    return { ok: res.ok, status: res.status, res };
  } catch (e) {
    if (e instanceof TypeError || e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')) {
      markServerDown();
      return { ok: false, status: 0, down: true };
    }
    throw e;
  }
}

// Helper: invoca uma função Base44 e extrai .data da resposta
export async function invokeBase44(name, args) {
  const resp = await base44.functions.invoke(name, args);
  return resp?.data ?? resp;
}

// Helper: lê o customer_id atual do localStorage
export function getCurrentCustomerId() {
  try {
    const raw = localStorage.getItem('smoke_customer_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.customer?.id || parsed.id || null;
    }
  } catch {}
  return null;
}