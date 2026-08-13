// ============================================================
// freightService.js — SERVIÇO DE FRETE E ROTAS
// ============================================================
// Réplica exata da lógica das Base44 Functions:
//   calculateFreight (geocodifica + rota + tabela/per_km + validações)
//   getDeliveryRoute (rota entre loja e cliente)
//
// Centralizado em service para reutilização futura pelo placeOrder.
// Integrações: Nominatim (geocodificação) + OSRM (rota real).
// Fallbacks: Haversine se OSRM falhar; null se Nominatim falhar.
// ============================================================

import { storeSettingsRepository } from '../repositories/storeSettingsRepository.js';
import { customerAddressRepository } from '../repositories/customerAddressRepository.js';
import { geocodeAddress, calculateRoute, buildGeocodeQuery } from '../utils/geo.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ============================================================
// POST /api/freight/calculate
// Réplica de calculateFreight/entry.ts
// ============================================================
// Parâmetros: { address_id?, address? }
// Não confia em distância do frontend — recalcula via OSRM.
export async function calculateFreight(addressId, address) {
  let clientLat, clientLng, clientAddress;

  // 1. Determinar localização do cliente
  if (addressId) {
    const saved = await customerAddressRepository.findById(addressId);
    if (!saved) throw httpError('Endereço não encontrado', 404);
    clientLat = saved.lat;
    clientLng = saved.lng;
    clientAddress = saved;
    if (clientLat == null || clientLng == null) {
      const geo = await geocodeAddress(buildGeocodeQuery(saved));
      if (!geo) throw httpError('Não foi possível localizar o endereço. Edite e tente novamente.', 404);
      clientLat = geo.lat;
      clientLng = geo.lng;
      await customerAddressRepository.update(addressId, { lat: geo.lat, lng: geo.lng });
    }
  } else if (address) {
    const geo = await geocodeAddress(buildGeocodeQuery(address));
    if (!geo) throw httpError('Endereço não encontrado. Verifique os dados e tente novamente.', 404);
    clientLat = geo.lat;
    clientLng = geo.lng;
    clientAddress = { ...address, lat: geo.lat, lng: geo.lng };
  } else {
    throw httpError('Endereço é obrigatório', 400);
  }

  // 2. Buscar settings da loja
  const settings = await storeSettingsRepository.getSingleton();
  if (!settings) throw httpError('Loja ainda não configurou endereço de entrega. Entre em contato.', 503);
  if (!settings.delivery_enabled) throw httpError('Entregas estão temporariamente desativadas.', 503);

  // 3. Validar área de entrega (cidade/estado)
  const deliveryCity = (settings.delivery_city || '').toLowerCase().replace(/\s+/g, '').trim();
  const deliveryState = (settings.delivery_state || '').toUpperCase().trim();
  const clientCity = (clientAddress.city || '').toLowerCase().replace(/\s+/g, '').trim();
  const clientState = (clientAddress.state || '').toUpperCase().trim();
  if (deliveryCity && deliveryState && (clientCity !== deliveryCity || clientState !== deliveryState)) {
    throw httpError(`Entregamos apenas em ${settings.delivery_city}/${settings.delivery_state}`, 403);
  }

  // 4. Validar endereço da loja
  const storeLat = settings.lat;
  const storeLng = settings.lng;
  if (storeLat == null || storeLng == null) {
    throw httpError('Endereço da loja não geolocalizado. Admin deve salvar as configurações.', 503);
  }

  // 5. Calcular rota real (OSRM com fallback Haversine)
  const route = await calculateRoute(storeLat, storeLng, clientLat, clientLng);
  const distanceKm = route.distance / 1000;
  const roundedKm = Math.round(distanceKm * 10) / 10;

  // 6. Tabela de frete por distância (prioridade sobre o modo por KM)
  const freightTable = (settings.freight_table || []).filter((r) => r.distance_km != null && r.price != null);
  if (freightTable.length > 0) {
    const sorted = [...freightTable].sort((a, b) => a.distance_km - b.distance_km);
    const match = sorted.find((range) => distanceKm <= range.distance_km);
    if (!match) {
      const maxRange = sorted[sorted.length - 1];
      // Endereços já cadastrados são aceitos mesmo além do raio, usando a faixa máxima
      if (!addressId) {
        throw httpError(
          `Desculpe, ainda não realizamos entregas neste endereço. Distância máxima de entrega: ${maxRange.distance_km} km.`,
          403
        );
      }
      return {
        distance_km: roundedKm,
        distance_meters: route.distance,
        duration_seconds: route.duration,
        freight: Math.round(maxRange.price * 100) / 100,
        freight_mode: 'table',
        freight_range_km: maxRange.distance_km,
        free_freight_threshold: settings.free_freight_threshold || 0,
        estimated_delivery_minutes: settings.estimated_delivery_minutes || 30,
        client_lat: clientLat,
        client_lng: clientLng,
        client_address: clientAddress,
        route_geometry: route.geometry,
      };
    }
    return {
      distance_km: roundedKm,
      distance_meters: route.distance,
      duration_seconds: route.duration,
      freight: Math.round(match.price * 100) / 100,
      freight_mode: 'table',
      freight_range_km: match.distance_km,
      free_freight_threshold: settings.free_freight_threshold || 0,
      estimated_delivery_minutes: settings.estimated_delivery_minutes || 30,
      client_lat: clientLat,
      client_lng: clientLng,
      client_address: clientAddress,
      route_geometry: route.geometry,
    };
  }

  // 7. Fallback: modo por KM (configuração legada)
  const freightPerKm = settings.freight_per_km || 0;
  const maxRadius = settings.max_delivery_radius_km || 0;
  // Endereços já cadastrados ignoram o raio máximo; só bloqueia novos endereços
  if (maxRadius > 0 && distanceKm > maxRadius && !addressId) {
    throw httpError(`Distância de ${roundedKm} km excede o raio máximo de entrega de ${maxRadius} km`, 403);
  }

  let freight = distanceKm * freightPerKm;
  if (settings.min_freight && freight < settings.min_freight) {
    freight = settings.min_freight;
  }

  return {
    distance_km: roundedKm,
    distance_meters: route.distance,
    duration_seconds: route.duration,
    freight_per_km: freightPerKm,
    freight: Math.round(freight * 100) / 100,
    freight_mode: 'per_km',
    min_freight: settings.min_freight || 0,
    free_freight_threshold: settings.free_freight_threshold || 0,
    estimated_delivery_minutes: settings.estimated_delivery_minutes || 30,
    client_lat: clientLat,
    client_lng: clientLng,
    client_address: clientAddress,
    route_geometry: route.geometry,
  };
}

// ============================================================
// POST /api/freight/route
// Réplica de getDeliveryRoute/entry.ts
// ============================================================
// Parâmetros: { address?, lat?, lng? }
// Requer autenticação (qualquer tipo).
export async function calculateRouteInfo(address, lat, lng) {
  if (!address && (lat == null || lng == null)) {
    throw httpError('Endereço é obrigatório', 400);
  }

  const settings = await storeSettingsRepository.getSingleton();
  if (!settings || settings.lat == null || settings.lng == null) {
    throw httpError('Endereço da loja não configurado', 503);
  }

  const storeLat = settings.lat;
  const storeLng = settings.lng;

  let clientLat, clientLng, clientAddress;
  if (lat != null && lng != null) {
    clientLat = lat;
    clientLng = lng;
    clientAddress = address || '';
  } else {
    const geo = await geocodeAddress(address);
    if (!geo) throw httpError('Endereço não encontrado', 404);
    clientLat = geo.lat;
    clientLng = geo.lng;
    clientAddress = geo.display_name;
  }

  const route = await calculateRoute(storeLat, storeLng, clientLat, clientLng);

  return {
    store_lat: storeLat,
    store_lon: storeLng,
    client_lat: clientLat,
    client_lon: clientLng,
    client_address: clientAddress,
    route_geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
  };
}