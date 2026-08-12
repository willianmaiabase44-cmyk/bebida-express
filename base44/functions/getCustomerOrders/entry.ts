import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Retorna os pedidos de um cliente (ou um pedido específico se order_id for fornecido).
// Usa asServiceRole pois os pedidos têm RLS admin-only e o cliente não tem auth da plataforma.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customer_id, order_id } = body;

    if (!customer_id) return Response.json({ error: "customer_id obrigatório" }, { status: 400 });

    if (order_id) {
      const order = await base44.asServiceRole.entities.Order.get(order_id);
      if (!order || order.customer_id !== customer_id) {
        return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
      }
      return Response.json({ order });
    }

    const orders = await base44.asServiceRole.entities.Order.filter(
      { customer_id },
      "-created_date",
      50
    );
    return Response.json({ orders: orders || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}