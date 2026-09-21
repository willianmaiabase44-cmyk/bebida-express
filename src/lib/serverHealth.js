// ============================================================
// serverHealth.js — Utilitário de sessão do cliente
// ============================================================
// Os fallbacks do Base44 foram removidos na Fase 5.
// Mantém apenas o helper de leitura do customer_id.
// ============================================================

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