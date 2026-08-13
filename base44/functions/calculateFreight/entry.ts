import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { geocodeAddress, calculateRoute, buildFullAddress, buildGeocodeQuery } from "../../shared/geo.ts";

// Calcula frete validado pelo backend: geocodifica endereço, busca settings da loja,
// calcula rota real (OSRM) e aplica valor por KM configurado pelo admin.
// Não requer auth da plataforma — clientes usam sessão por celular.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { address_id, address } = body;

    let clientLat, clientLng, clientAddress;

    if (address_id) {
      const saved = await base44.asServiceRole.entities.CustomerAddress.get(address_id);
      if (!saved) return Response.json({ error: "Endereço não encontrado" }, { status: 404 });
      clientLat = saved.lat;
      clientLng = saved.lng;
      clientAddress = saved;
      if (clientLat == null || clientLng == null) {
        const geo = await geocodeAddress(buildGeocodeQuery(saved));
        if (!geo) return Response.json({ error: "Não foi possível localizar o endereço. Edite e tente novamente." }, { status: 404 });
        clientLat = geo.lat;
        clientLng = geo.lng;
        await base44.asServiceRole.entities.CustomerAddress.update(address_id, { lat: geo.lat, lng: geo.lng });
      }
    } else if (address) {
      const geo = await geocodeAddress(buildGeocodeQuery(address));
      if (!geo) return Response.json({ error: "Endereço não encontrado. Verifique os dados e tente novamente." }, { status: 404 });
      clientLat = geo.lat;
      clientLng = geo.lng;
      clientAddress = { ...address, lat: geo.lat, lng: geo.lng };
    } else {
      return Response.json({ error: "Endereço é obrigatório" }, { status: 400 });
    }

    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList?.[0];
    if (!settings) return Response.json({ error: "Loja ainda não configurou endereço de entrega. Entre em contato." }, { status: 503 });
    if (!settings.delivery_enabled) return Response.json({ error: "Entregas estão temporariamente desativadas." }, { status: 503 });

    // Valida área de entrega (cidade/estado)
    const deliveryCity = (settings.delivery_city || "").toLowerCase().replace(/\s+/g, "").trim();
    const deliveryState = (settings.delivery_state || "").toUpperCase().trim();
    const clientCity = (clientAddress.city || "").toLowerCase().replace(/\s+/g, "").trim();
    const clientState = (clientAddress.state || "").toUpperCase().trim();
    if (deliveryCity && deliveryState && (clientCity !== deliveryCity || clientState !== deliveryState)) {
      return Response.json({ error: `Entregamos apenas em ${settings.delivery_city}/${settings.delivery_state}` }, { status: 403 });
    }

    const storeLat = settings.lat;
    const storeLng = settings.lng;
    if (storeLat == null || storeLng == null) {
      return Response.json({ error: "Endereço da loja não geolocalizado. Admin deve salvar as configurações." }, { status: 503 });
    }

    const route = await calculateRoute(storeLat, storeLng, clientLat, clientLng);
    const distanceKm = route.distance / 1000;
    const roundedKm = Math.round(distanceKm * 10) / 10;

    // Tabela de frete por distância (prioridade sobre o modo por KM)
    const freightTable = (settings.freight_table || []).filter(r => r.distance_km != null && r.price != null);
    if (freightTable.length > 0) {
      const sorted = [...freightTable].sort((a, b) => a.distance_km - b.distance_km);
      // Procura a menor faixa que comporta a distância calculada
      const match = sorted.find(range => distanceKm <= range.distance_km);
      if (!match) {
        const maxRange = sorted[sorted.length - 1];
        return Response.json({ error: `Desculpe, ainda não realizamos entregas neste endereço. Distância máxima de entrega: ${maxRange.distance_km} km.` }, { status: 403 });
      }
      return Response.json({
        distance_km: roundedKm,
        distance_meters: route.distance,
        duration_seconds: route.duration,
        freight: Math.round(match.price * 100) / 100,
        freight_mode: "table",
        freight_range_km: match.distance_km,
        free_freight_threshold: settings.free_freight_threshold || 0,
        estimated_delivery_minutes: settings.estimated_delivery_minutes || 30,
        client_lat: clientLat,
        client_lng: clientLng,
        client_address: clientAddress,
        route_geometry: route.geometry,
      });
    }

    // Fallback: modo por KM (configuração legada)
    const freightPerKm = settings.freight_per_km || 0;
    const maxRadius = settings.max_delivery_radius_km || 0;
    if (maxRadius > 0 && distanceKm > maxRadius) {
      return Response.json({ error: `Distância de ${roundedKm} km excede o raio máximo de entrega de ${maxRadius} km` }, { status: 403 });
    }

    let freight = distanceKm * freightPerKm;
    if (settings.min_freight && freight < settings.min_freight) {
      freight = settings.min_freight;
    }

    return Response.json({
      distance_km: roundedKm,
      distance_meters: route.distance,
      duration_seconds: route.duration,
      freight_per_km: freightPerKm,
      freight: Math.round(freight * 100) / 100,
      freight_mode: "per_km",
      min_freight: settings.min_freight || 0,
      free_freight_threshold: settings.free_freight_threshold || 0,
      estimated_delivery_minutes: settings.estimated_delivery_minutes || 30,
      client_lat: clientLat,
      client_lng: clientLng,
      client_address: clientAddress,
      route_geometry: route.geometry,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}