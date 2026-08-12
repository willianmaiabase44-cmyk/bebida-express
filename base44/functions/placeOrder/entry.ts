import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { geocodeAddress, calculateRoute, buildFullAddress, buildGeocodeQuery } from "../../shared/geo.ts";

// Cria o pedido online com validação completa no backend.
// Não confia em preço, frete, desconto ou total enviados pelo frontend.
// Recalcula tudo usando dados reais do banco e baixa estoque automaticamente.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { items, address_id, address, payment_method, change_for, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Carrinho vazio" }, { status: 400 });
    }
    if (!payment_method) return Response.json({ error: "Forma de pagamento obrigatória" }, { status: 400 });

    // 1. Busca configurações da loja
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList?.[0];
    if (!settings) return Response.json({ error: "Loja não configurada para entregas" }, { status: 503 });
    if (!settings.delivery_enabled) return Response.json({ error: "Entregas desativadas" }, { status: 503 });

    // 2. Resolve endereço de entrega
    let deliveryAddress, clientLat, clientLng;
    if (address_id) {
      const saved = await base44.entities.CustomerAddress.get(address_id);
      if (!saved) return Response.json({ error: "Endereço não encontrado" }, { status: 404 });
      deliveryAddress = saved;
      clientLat = saved.lat;
      clientLng = saved.lng;
      if (clientLat == null || clientLng == null) {
        const geo = await geocodeAddress(buildGeocodeQuery(saved));
        if (!geo) return Response.json({ error: "Endereço não localizado" }, { status: 404 });
        clientLat = geo.lat;
        clientLng = geo.lng;
        await base44.entities.CustomerAddress.update(address_id, { lat: geo.lat, lng: geo.lng });
      }
    } else if (address) {
      const geo = await geocodeAddress(buildGeocodeQuery(address));
      if (!geo) return Response.json({ error: "Endereço não localizado. Verifique os dados." }, { status: 404 });
      deliveryAddress = { ...address, lat: geo.lat, lng: geo.lng };
      clientLat = geo.lat;
      clientLng = geo.lng;
    } else {
      return Response.json({ error: "Endereço de entrega obrigatório" }, { status: 400 });
    }

    // Valida área de entrega (cidade/estado)
    const deliveryCity = (settings.delivery_city || "").toLowerCase().replace(/\s+/g, "").trim();
    const deliveryState = (settings.delivery_state || "").toUpperCase().trim();
    const clientCity = (deliveryAddress.city || "").toLowerCase().replace(/\s+/g, "").trim();
    const clientState = (deliveryAddress.state || "").toUpperCase().trim();
    if (deliveryCity && deliveryState && (clientCity !== deliveryCity || clientState !== deliveryState)) {
      return Response.json({ error: `Entregamos apenas em ${settings.delivery_city}/${settings.delivery_state}` }, { status: 403 });
    }

    // 3. Calcula rota e frete (backend)
    const storeLat = settings.lat;
    const storeLng = settings.lng;
    if (storeLat == null || storeLng == null) {
      return Response.json({ error: "Endereço da loja não geolocalizado" }, { status: 503 });
    }
    const route = await calculateRoute(storeLat, storeLng, clientLat, clientLng);
    const distanceKm = route.distance / 1000;
    const freightPerKm = settings.freight_per_km || 0;
    let freight = distanceKm * freightPerKm;
    if (settings.min_freight && freight < settings.min_freight) {
      freight = settings.min_freight;
    }
    freight = Math.round(freight * 100) / 100;

    // 4. Valida produtos e calcula subtotal (preços do banco, não do frontend)
    const productIds = items.map((i) => i.product_id).filter(Boolean);
    const products = await base44.asServiceRole.entities.Product.filter({ id: { $in: productIds } });

    const validatedItems = [];
    let subtotal = 0;
    const stockUpdates = [];

    for (const item of items) {
      if (item.is_kit) {
        // Kits: usa o preço enviado (combo customizado), sem baixa individual
        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;
        validatedItems.push({
          product_id: item.product_id || "",
          product_name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          is_kit: true,
          kit_items: item.kit_items || "",
        });
        continue;
      }

      const product = products.find((p) => p.id === item.product_id);
      if (!product) return Response.json({ error: `Produto não encontrado: ${item.product_name}` }, { status: 400 });
      if (!product.active) return Response.json({ error: `Produto indisponível: ${product.name}` }, { status: 400 });

      // Valida estoque
      if (product.stock < item.quantity) {
        return Response.json({ error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}` }, { status: 400 });
      }

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: item.quantity,
        is_kit: false,
      });

      stockUpdates.push({
        id: product.id,
        stock: product.stock - item.quantity,
        product_name: product.name,
        quantity: item.quantity,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const total = Math.round((subtotal + freight) * 100) / 100;

    // 5. Gera número do pedido
    const existingOrders = await base44.asServiceRole.entities.Order.list("-order_number", 1);
    const lastNumber = existingOrders?.[0]?.order_number || 1000;
    const orderNumber = lastNumber + 1;

    // 6. Cria o pedido
    const orderData = {
      order_number: orderNumber,
      customer_name: user.full_name || "Cliente",
      customer_phone: user.data?.phone || "",
      customer_email: user.email,
      address: {
        cep: deliveryAddress.cep,
        street: deliveryAddress.street,
        number: deliveryAddress.number,
        complement: deliveryAddress.complement,
        district: deliveryAddress.district,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        reference: deliveryAddress.reference,
        full: buildFullAddress(deliveryAddress),
      },
      address_lat: clientLat,
      address_lng: clientLng,
      items: validatedItems,
      subtotal,
      distance_km: Math.round(distanceKm * 10) / 10,
      freight_per_km: freightPerKm,
      freight,
      discount: 0,
      total,
      payment_method,
      change_for: change_for || null,
      status: "novo",
      channel: "online",
      notes: notes || "",
      status_history: [{ status: "novo", date: new Date().toISOString(), by: user.email }],
      date: new Date().toISOString().split("T")[0],
    };

    const order = await base44.entities.Order.create(orderData);

    // 7. Baixa estoque + registra movimentações
    for (const su of stockUpdates) {
      await base44.asServiceRole.entities.Product.update(su.id, { stock: su.stock });
      await base44.asServiceRole.entities.StockMovement.create({
        product_id: su.id,
        product_name: su.product_name,
        type: "saida",
        quantity: su.quantity,
        date: orderData.date,
        reason: `Pedido online #${orderNumber}`,
        stock_after: su.stock,
      });
    }

    return Response.json({
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      total,
      subtotal,
      freight,
      distance_km: orderData.distance_km,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}