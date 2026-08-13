// ============================================================
// orderStatusService.js — MÁQUINA DE ESTADOS DE PEDIDOS
// ============================================================
// Centraliza TODAS as transições de status permitidas.
// Services e controllers consultam este módulo — regras nunca
// ficam espalhadas.
// ============================================================

const VALID_STATUSES = [
  'novo',
  'confirmado',
  'em_preparacao',
  'pronto',
  'saiu_para_entrega',
  'entregue',
  'cancelado',
];

// Transições permitidas (forward + cancelamento a qualquer momento pré-terminal)
const TRANSITIONS = {
  novo: ['confirmado', 'em_preparacao', 'pronto', 'cancelado'],
  confirmado: ['em_preparacao', 'pronto', 'cancelado'],
  em_preparacao: ['pronto', 'cancelado'],
  pronto: ['saiu_para_entrega', 'cancelado'],
  saiu_para_entrega: ['entregue', 'cancelado'],
  entregue: [],
  cancelado: [],
};

export const orderStatusService = {
  isValidStatus(status) {
    return VALID_STATUSES.includes(status);
  },

  canTransition(from, to) {
    if (!this.isValidStatus(from) || !this.isValidStatus(to)) return false;
    return TRANSITIONS[from]?.includes(to) || false;
  },

  getValidTransitions(from) {
    return TRANSITIONS[from] || [];
  },

  isTerminal(status) {
    return (TRANSITIONS[status] || []).length === 0;
  },
};