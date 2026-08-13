// ============================================================
// geo.js — Geocodificação e roteirização (Nominatim + OSRM)
// ============================================================
// Porte direto de base44/shared/geo.ts para ESM JavaScript.
// Gratuitos, sem chave de API.
// Fallbacks seguros para erros de rede (Nominatim/OSRM indisponível).
// ============================================================

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

// Geocodifica um endereço textual em lat/lng via Nominatim.
// Retorna { lat, lng, display_name } ou null (não encontrado ou erro de rede).
export async function geocodeAddress(address) {
  try {
    const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(address + ', Brasil')}&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SmokeBebidas/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch {
    // Erro de rede / timeout — trata como "não encontrado"
    return null;
  }
}

// Calcula rota real via OSRM. Fallback Haversine (linha reta) se OSRM falhar.
export async function calculateRoute(storeLat, storeLng, clientLat, clientLng) {
  try {
    const url = `${OSRM_URL}/${storeLng},${storeLat};${clientLng},${clientLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM error');
    const data = await res.json();
    if (!data?.routes?.length) {
      throw new Error('No routes');
    }
    const route = data.routes[0];
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry.coordinates.map((c) => [c[1], c[0]]),
    };
  } catch {
    // Fallback: distância em linha reta (Haversine)
    const distance = haversine(storeLat, storeLng, clientLat, clientLng);
    return { distance, duration: 0, geometry: [[storeLat, storeLng], [clientLat, clientLng]] };
  }
}

// Distância em metros entre dois pontos (Haversine)
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Endereço completo formatado (para exibição)
export function buildFullAddress(addr) {
  if (!addr) return '';
  const parts = [
    `${addr.street}, ${addr.number}`,
    addr.complement,
    addr.district,
    `${addr.city} - ${addr.state}`,
    addr.cep ? `CEP: ${addr.cep}` : '',
  ].filter(Boolean);
  return parts.join(' - ');
}

// Query enxuta para geocodificação (sem prefixos como "CEP:" que confundem o Nominatim)
export function buildGeocodeQuery(addr) {
  if (!addr) return '';
  const parts = [
    `${addr.street}, ${addr.number}`,
    addr.district,
    `${addr.city}, ${addr.state}`,
    addr.cep,
  ].filter(Boolean);
  return parts.join(', ');
}