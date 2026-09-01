// ============================================================
// orderService.js — Serviço de pedidos (frontend)
// ============================================================
// Comunica-se exclusivamente com o backend /server via apiClient.
// Nenhuma dependência do Base44 neste arquivo.
// ============================================================

import { api } from '@/lib/apiClient';

// Cria um pedido (checkout). O backend recalcula tudo: preços,
// frete, cupom, desconto, total. O frontend envia apenas os itens,
// endereço, pagamento e cupom — nunca valores finais.
//
// idempotencyKey (opcional): protege contra duplo clique / retry.
export async function createOrder(payload, idempotencyKey) {
  const headers = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await api.post('/orders', payload, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao finalizar pedido');
  }
  return res.json();
}

// Busca um pedido por ID (cliente só vê o próprio)
export async function getOrderById(orderId) {
  const res = await api.get(`/orders/${orderId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Pedido não encontrado');
  }
  return res.json();
}

// Lista pedidos do cliente
export async function getMyOrders(customerId) {
  const res = await api.get(`/orders/customer/${customerId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao carregar pedidos');
  }
  return res.json();
}

// Gera uma chave de idempotência (UUID v4)
export function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
}