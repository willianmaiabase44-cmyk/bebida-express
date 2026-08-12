// Geocodificação e roteirização reutilizáveis (Nominatim + OSRM — gratuitos, sem chave de API)

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

export async function geocodeAddress(address) {
  const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(address + ", Brasil")}&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "SmokeBebidas/1.0" } });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display_name: data[0].display_name,
  };
}

export async function calculateRoute(storeLat, storeLng, clientLat, clientLng) {
  const url = `${OSRM_URL}/${storeLng},${storeLat};${clientLng},${clientLat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data?.routes?.length) {
    // fallback: distância em linha reta (Haversine)
    const distance = haversine(storeLat, storeLng, clientLat, clientLng);
    return { distance, duration: 0, geometry: [[storeLat, storeLng], [clientLat, clientLng]] };
  }
  const route = data.routes[0];
  return {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry.coordinates.map((c) => [c[1], c[0]]),
  };
}

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

export function buildFullAddress(addr) {
  if (!addr) return "";
  const parts = [
    `${addr.street}, ${addr.number}`,
    addr.complement,
    addr.district,
    `${addr.city} - ${addr.state}`,
    addr.cep ? `CEP: ${addr.cep}` : "",
  ].filter(Boolean);
  return parts.join(" - ");
}

// Query enxuta para geocodificação (sem prefixos como "CEP:" que confundem o Nominatim)
export function buildGeocodeQuery(addr) {
  if (!addr) return "";
  const parts = [
    `${addr.street}, ${addr.number}`,
    addr.district,
    `${addr.city}, ${addr.state}`,
    addr.cep,
  ].filter(Boolean);
  return parts.join(", ");
}