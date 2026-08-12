import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Coordenadas da loja (Smoke Bebidas) — altere para o endereço real
const STORE_LAT = -23.5505;
const STORE_LON = -46.6333;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const address = body?.address;
    if (!address) return Response.json({ error: 'Endereço é obrigatório' }, { status: 400 });

    // 1. Geocodificar endereço do cliente via Nominatim (OpenStreetMap)
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Brasil')}&limit=1`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': 'SmokeBebidas/1.0' }
    });
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      return Response.json({ error: 'Endereço não encontrado. Verifique e tente novamente.' }, { status: 404 });
    }

    const clientLat = parseFloat(geoData[0].lat);
    const clientLon = parseFloat(geoData[0].lon);
    const displayName = geoData[0].display_name;

    // 2. Calcular rota da loja até o cliente via OSRM
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${STORE_LON},${STORE_LAT};${clientLon},${clientLat}?overview=full&geometries=geojson`;
    const routeRes = await fetch(routeUrl);
    const routeData = await routeRes.json();

    let routeGeometry = [[STORE_LAT, STORE_LON], [clientLat, clientLon]];
    let distance = 0;
    let duration = 0;

    if (routeData?.routes?.length > 0) {
      const route = routeData.routes[0];
      routeGeometry = route.geometry.coordinates.map(c => [c[1], c[0]]); // [lon,lat] -> [lat,lon]
      distance = route.distance;
      duration = route.duration;
    }

    return Response.json({
      store_lat: STORE_LAT,
      store_lon: STORE_LON,
      client_lat: clientLat,
      client_lon: clientLon,
      client_address: displayName,
      route_geometry: routeGeometry,
      distance,
      duration
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}