import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { geocodeAddress, calculateRoute, buildFullAddress, buildGeocodeQuery } from "../../shared/geo.ts";

// Calcula frete validado pelo backend: geocodifica endereço, busca settings da loja,
// calcula rota real (OSRM) e aplica valor por KM configurado pelo admin.
// Não confia em nenhum valor enviado pelo frontend.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { address_id, address } = body;

    let clientLat, clientLng, clientAddress;

    // Se veio address_id, busca o endereço salvo do cliente
    if (address_id) {
      const saved = await base44.entities.CustomerAddress.get(address_id);
      if (!saved) return Response.json({ error: "Endereço não encontrado" }, { status: 404 });
      clientLat = saved.lat;
      clientLng = saved.lng;
      clientAddress = saved;
      // Se não tem coords salvas, geocodifica agora
      if (clientLat == null || clientLng == null) {
        const geo = await geocodeAddress(buildGeocodeQuery(saved));
        if (!geo) return Response.json({ error: "Não foi possível localizar o endereço salvo. Edite e tente novamente." }, { status: 404 });
        clientLat = geo.lat;
        clientLng = geo.lng;
        // Atualiza o endereço salvo com as coords
        await base44.entities.CustomerAddress.update(address_id, { lat: geo.lat, lng: geo.lng });
      }
    } else if (address) {
      // Endereço digitado na hora
      const geo = await geocodeAddress(buildGeocodeQuery(address));
      if (!geo) return Response.json({ error: "Endereço não encontrado. Verifique os dados e tente novamente." }, { status: 404 });
      clientLat = geo.lat;
      clientLng = geo.lng;
      clientAddress = { ...address, lat: geo.lat, lng: geo.lng };
    } else {
      return Response.json({ error: "Endereço é obrigatório" }, { status: 400 });
    }

    // Busca configurações da loja (primeiro registro)
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList?.[0];
    if (!settings) return Response.json({ error: "Loja ainda não configurou endereço de entrega. Entre em contato." }, { status: 503 });
    if (!settings.delivery_enabled) return Response.json({ error: "Entregas estão temporariamente desativadas." }, { status: 503 });

    const storeLat = settings.lat;
    const storeLng = settings.lng;
    if (storeLat == null || storeLng == null) {
      return Response.json({ error: "Endereço da loja não geolocalizado. Admin deve salvar as configurações." }, { status: 503 });
    }

    // Calcula rota real
    const route = await calculateRoute(storeLat, storeLng, clientLat, clientLng);
    const distanceKm = route.distance / 1000;
    const freightPerKm = settings.freight_per_km || 0;
    let freight = distanceKm * freightPerKm;
    if (settings.min_freight && freight < settings.min_freight) {
      freight = settings.min_freight;
    }

    return Response.json({
      distance_km: Math.round(distanceKm * 10) / 10,
      distance_meters: route.distance,
      duration_seconds: route.duration,
      freight_per_km: freightPerKm,
      freight: Math.round(freight * 100) / 100,
      min_freight: settings.min_freight || 0,
      store_lat: storeLat,
      store_lng: storeLng,
      client_lat: clientLat,
      client_lng: clientLng,
      client_address: clientAddress,
      route_geometry: route.geometry,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}