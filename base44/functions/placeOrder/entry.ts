import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { geocodeAddress, calculateRoute, buildFullAddress, buildGeocodeQuery } from "../../shared/geo.ts";

// Cria o pedido online com validação completa no backend.
// Não requer auth da plataforma — clientes usam sessão por celular (customer_id).
// Recalcula tudo usando dados reais do banco e baixa estoque automaticamente.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { items, address_id, customer_id, payment_method, change_for, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Carrinho vazio" }, { status: 400 });
    }
    if (!payment_method) return Response.json({ error: "Forma de pagamento obrigatória" }, { status: 400 });
    if (!customer_id) return Response.json({ error: "Cliente obrigatório" }, { status: 400 });

    // 1. Busca configurações da loja
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList?.[0];
    if (!settings) return Response.json({ error: "Loja não configurada para entregas" }, { status: 503 });
    if (!settings.delivery_enabled) return Response.json({ error: "Entregas desativadas" }, { status: 503 });

    // 2. Busca cliente
    const customer = await base44.asServiceRole.entities.Customer.get(customer_id);
    if (!customer) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

    // 3. Resolve endereço de entrega
    if (!address_id) return Response.json({ error: "Endereço de entrega obrigatório" }, { status: 400 });
    const saved = await base44.asServiceRole.entities.CustomerAddress.get(address_id);
    if (!saved) return Response.json({ error: "Endereço não encontrado" }, { status: 404 });

    let clientLat = saved.lat;
    let clientLng = saved.lng;
    let deliveryAddress = saved;

    if (clientLat == null || clientLng == null) {
      const geo = await geocodeAddress(buildGeocodeQuery(saved));
      if (!geo) return Response.json({ error: "Endereço não localizado" }, { status: 404 });
      clientLat = geo.lat;
      clientLng = geo.lng;
      await base44.asServiceRole.entities.CustomerAddress.update(address_id, { lat: geo.lat, lng: geo.lng });
    }

    // Valida área de entrega (cidade/estado)
    const deliveryCity = (settings.delivery_city || "").toLowerCase().replace(/\s+/g, "").trim();
    const deliveryState = (settings.delivery_state || "").toUpperCase().trim();
    const clientCity = (deliveryAddress.city || "").toLowerCase().replace(/\s+/g, "").trim();
    const clientState = (deliveryAddress.state || "").toUpperCase().trim();
    if (deliveryCity && deliveryState && (clientCity !== deliveryCity || clientState !== deliveryState)) {
      return Response.json({ error: `Entregamos apenas em ${settings.delivery_city}/${settings.delivery_state}` }, { status: 403 });
    }

    // 4. Calcula rota e frete (backend)
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

    // 5. Valida produtos e calcula subtotal (preços do banco, não do frontend)
    const productIds = items.map((i) => i.product_id).filter(Boolean);
    const products = await base44.asServiceRole.entities.Product.filter({ id: { $in: productIds } });

    const validatedItems = [];
    let subtotal = 0;
    const stockUpdates = [];

    for (const item of items) {
      if (item.is_kit) {
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

    // 6. Gera número do pedido
    const existingOrders = await base44.asServiceRole.entities.Order.list("-order_number", 1);
    const lastNumber = existingOrders?.[0]?.order_number || 1000;
    const orderNumber = lastNumber + 1;

    // 7. Cria o pedido
    const orderData = {
      customer_id: customer.id,
      order_number: orderNumber,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email || "",
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
      status_history: [{ status: "novo", date: new Date().toISOString(), by: customer.phone }],
      date: new Date().toISOString().split("T")[0],
    };

    const order = await base44.asServiceRole.entities.Order.create(orderData);

    // 8. Baixa estoque + registra movimentações
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