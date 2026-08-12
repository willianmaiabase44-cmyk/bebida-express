import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_id, customer_id, rating, comment } = body || {};

    if (!order_id || !customer_id || !rating) {
      return Response.json({ error: "Pedido, cliente e nota são obrigatórios" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return Response.json({ error: "Nota deve ser entre 1 e 5" }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) return Response.json({ error: "Pedido não encontrado" }, { status: 404 });

    if (order.status !== "entregue") {
      return Response.json({ error: "Apenas pedidos entregues podem ser avaliados" }, { status: 400 });
    }

    if (order.customer_id !== customer_id) {
      return Response.json({ error: "Este pedido não pertence a você" }, { status: 403 });
    }

    // Verifica se já existe avaliação para este pedido
    const existing = await base44.asServiceRole.entities.DeliveryReview.filter({ order_id });
    if (existing?.length > 0) {
      return Response.json({ error: "Este pedido já foi avaliado" }, { status: 409 });
    }

    const review = await base44.entities.DeliveryReview.create({
      order_id,
      order_number: order.order_number,
      customer_id,
      customer_name: order.customer_name,
      motoboy_id: order.motoboy_id,
      motoboy_name: order.motoboy_name,
      rating,
      comment: comment || "",
      date: new Date().toISOString().split("T")[0],
    });

    // Recalcula média do motoboy
    if (order.motoboy_id) {
      const reviews = await base44.asServiceRole.entities.DeliveryReview.filter({ motoboy_id: order.motoboy_id });
      const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
      await base44.asServiceRole.entities.DeliveryDriver.update(order.motoboy_id, {
        rating: Math.round(avg * 10) / 10,
      });
    }

    return Response.json({ review });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}