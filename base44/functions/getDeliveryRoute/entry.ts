import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { calculateRoute } from "../../shared/geo.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const address = body?.address;
    if (!address) return Response.json({ error: "Endereço é obrigatório" }, { status: 400 });

    // Busca endereço da loja nas configurações (não mais hardcoded)
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList?.[0];
    if (!settings || settings.lat == null || settings.lng == null) {
      return Response.json({ error: "Endereço da loja não configurado" }, { status: 503 });
    }

    const STORE_LAT = settings.lat;
    const STORE_LON = settings.lng;

    // Geocodificar endereço do cliente
    const { geocodeAddress } = await import("../../shared/geo.ts");
    const geo = await geocodeAddress(address);
    if (!geo) return Response.json({ error: "Endereço não encontrado" }, { status: 404 });

    const route = await calculateRoute(STORE_LAT, STORE_LON, geo.lat, geo.lng);

    return Response.json({
      store_lat: STORE_LAT,
      store_lon: STORE_LON,
      client_lat: geo.lat,
      client_lon: geo.lng,
      client_address: geo.display_name,
      route_geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}