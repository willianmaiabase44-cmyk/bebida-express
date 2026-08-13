// ============================================================
// freightService.js — SERVIÇO DE FRETE E ROTAS
// ============================================================
// Cálculo de frete (a implementar na Etapa 2)
//
// Regras a preservar (da auditoria do Base44):
//   - Geocodificar endereço (Nominatim — gratuito, sem chave)
//   - Calcular rota real (OSRM — gratuito, sem chave)
//   - Aplicar tabela de frete por distância (freight_table) OU modo por KM
//   - Validar área de entrega (cidade/estado)
//   - Endereços já cadastrados ignoram raio máximo
//   - Fallback Haversine se OSRM falhar
//
// NÃO alterar integrações externas nesta etapa.
// ============================================================

// STATUS: PENDENTE — Etapa 2
export async function calculateFreight(addressId, address) {
  throw new Error('calculateFreight ainda não implementado — Etapa 2');
}

// STATUS: PENDENTE — Etapa 2
export async function calculateRoute(storeLat, storeLng, clientLat, clientLng) {
  throw new Error('calculateRoute ainda não implementado — Etapa 2');
}